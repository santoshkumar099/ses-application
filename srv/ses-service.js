const cds = require('@sap/cds');

const { SELECT, INSERT, UPDATE } = cds.ql;

const PO_SERVICE_URL = process.env.PO_SERVICE_URL;
const PO_TOKEN_URL = process.env.PO_TOKEN_URL;
const PO_CLIENT_ID = process.env.PO_CLIENT_ID;
const PO_CLIENT_SECRET = process.env.PO_CLIENT_SECRET;

const GST_RATE = 0.18;
const MAX_SES_ITEMS = 20;
const MIN_SES_GROSS_AMOUNT = 100;

module.exports = cds.service.impl(async function () {

    console.log('Service Entry Sheet Service Loaded');

    const {
        ServiceEntrySheets,
        ServiceEntrySheetItems,
        StatusHistory
    } = cds.entities('ses');

    function getCurrentUser(req) {
        return req.user?.id || 'unknown';
    }

    function validatePOConfiguration() {
        if (!PO_SERVICE_URL) {
            throw new Error('PO_SERVICE_URL environment variable is not configured.');
        }

        if (!PO_TOKEN_URL) {
            throw new Error('PO_TOKEN_URL environment variable is not configured.');
        }

        if (!PO_CLIENT_ID) {
            throw new Error('PO_CLIENT_ID environment variable is not configured.');
        }

        if (!PO_CLIENT_SECRET) {
            throw new Error('PO_CLIENT_SECRET environment variable is not configured.');
        }
    }

    async function getPOAccessToken() {
        validatePOConfiguration();

        const credentials = Buffer
            .from(`${PO_CLIENT_ID}:${PO_CLIENT_SECRET}`)
            .toString('base64');

        const response = await fetch(PO_TOKEN_URL, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            body: 'grant_type=client_credentials'
        });

        if (!response.ok) {
            const errorText = await response.text();

            console.error(
                'PO token request failed:',
                response.status,
                errorText
            );

            throw new Error(
                'Unable to obtain PO service access token.'
            );
        }

        const data = await response.json();

        if (!data.access_token) {
            throw new Error(
                'PO service did not return an access token.'
            );
        }

        return data.access_token;
    }

    function buildPOUrl(path) {
        return `${PO_SERVICE_URL}${path}`;
    }

    function calculateItemAmounts(item) {
        const quantity = Number(item.serviceEntryQuantity || 0);
        const unitPrice = Number(item.unitPrice || 0);

        const netAmount = quantity * unitPrice;
        const taxAmount = netAmount * GST_RATE;
        const grossAmount = netAmount + taxAmount;

        return {
            netAmount: Number(netAmount.toFixed(2)),
            taxAmount: Number(taxAmount.toFixed(2)),
            grossAmount: Number(grossAmount.toFixed(2))
        };
    }

    function determineApprover(grossAmount) {
        const amount = Number(grossAmount || 0);

        if (amount <= 50000) {
            return 'Manager';
        }

        if (amount <= 200000) {
            return 'SeniorManager';
        }

        return 'Director';
    }

    async function generateSESNumber(tx) {
        const year = new Date().getFullYear();

        const existing = await tx.run(
            SELECT
                .from(ServiceEntrySheets)
                .columns('sesNumber')
                .where({
                    sesNumber: {
                        like: `SES-${year}-%`
                    }
                })
        );

        let maxNumber = 0;

        for (const record of existing) {
            const match = String(record.sesNumber || '')
                .match(new RegExp(`^SES-${year}-(\\d+)$`));

            if (match) {
                const number = parseInt(match[1], 10);

                if (!Number.isNaN(number) && number > maxNumber) {
                    maxNumber = number;
                }
            }
        }

        return `SES-${year}-${String(maxNumber + 1).padStart(6, '0')}`;
    }

    async function getPurchaseOrder(poNumber) {
        if (!poNumber) {
            throw new Error(
                'Purchase Order Number is required.'
            );
        }

        const token = await getPOAccessToken();

        const encodedPO = encodeURIComponent(String(poNumber));

        const url = buildPOUrl(
            `/PurchaseOrders` +
            `?$filter=poNumber%20eq%20'${encodedPO}'` +
            `&$expand=items`
        );

        console.log('Fetching Purchase Order:', poNumber);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(
                'PO API returned:',
                response.status,
                JSON.stringify(data)
            );

            throw new Error(
                `Unable to fetch Purchase Order ${poNumber}.`
            );
        }

        if (!data.value || data.value.length === 0) {
            throw new Error(
                `Purchase Order ${poNumber} was not found.`
            );
        }

        return data.value[0];
    }

    function mapPOToSES(po, ses) {
        ses.poNumber = po.poNumber;
        ses.vendor = po.vendor;
        ses.currency = po.currency;
        ses.servicePeriodFrom = po.poDate;
        ses.servicePeriodTo = po.deliveryDate;
        ses.grossAmount = Number(po.totalAmount || 0);

        ses.items = (po.items || []).map(item => {
            const orderedQuantity = Number(item.quantity || 0);
            const previouslyAcceptedQty =
                Number(item.previouslyAcceptedQty || 0);

            const pendingQuantity = Math.max(
                orderedQuantity - previouslyAcceptedQty,
                0
            );

            const unitPrice = Number(item.unitPrice || 0);

            return {
                poItemNumber:
                    item.itemNumber ||
                    item.poItemNumber,

                serviceCode:
                    item.materialNumber ||
                    item.serviceCode,

                serviceDescription:
                    item.description ||
                    item.serviceDescription,

                orderedQuantity,
                previouslyAcceptedQty,
                pendingQuantity,
                remainingQuantity: pendingQuantity,
                serviceEntryQuantity: 0,
                unit: item.unit,
                unitPrice,
                netAmount: 0,
                taxAmount: 0,
                grossAmount: 0
            };
        });

        return ses;
    }

    this.on('READ', 'PurchaseOrders', async (req) => {
        try {
            const token = await getPOAccessToken();

            const url = buildPOUrl(
                `/PurchaseOrders` + `?$filter=status%20eq%20%27Approved%27`
            );

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();

                console.error(
                    'PO API returned:',
                    response.status,
                    errorText
                );

                return req.error(
                    502,
                    'Failed to load Purchase Orders from PO service.'
                );
            }

            const data = await response.json();
            const purchaseOrders = data.value || [];

            console.log(
                `Loaded ${purchaseOrders.length} approved Purchase Orders`
            );

            return purchaseOrders.map(po => ({
                poNumber: po.poNumber,
                vendor: po.vendor,
                currency: po.currency,
                status: po.status,
                validFrom: po.poDate,
                validTo: po.deliveryDate,
                totalAmount: po.totalAmount
            }));

        } catch (error) {
            console.error(
                'Failed to load Purchase Orders:',
                error.message
            );

            return req.error(
                502,
                'Unable to load Purchase Orders.'
            );
        }
    });

    this.on('READ', 'PurchaseOrderItems', async (req) => {
        try {
            const token = await getPOAccessToken();

            const url = buildPOUrl('/PurchaseOrderItems');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();

                console.error(
                    'PO Item API returned:',
                    response.status,
                    errorText
                );

                return req.error(
                    502,
                    'Unable to load Purchase Order Items.'
                );
            }

            const data = await response.json();
            const items = data.value || [];

            console.log(`Loaded ${items.length} PO items`);

            return items.map(item => ({
                poNumber: item.poNumber,

                poItemNumber:
                    item.poItemNumber ||
                    item.itemNumber,

                serviceCode:
                    item.serviceCode ||
                    item.materialNumber,

                serviceDescription:
                    item.serviceDescription ||
                    item.description,

                orderedQuantity:
                    item.orderedQuantity ||
                    item.quantity,

                previouslyAcceptedQty:
                    Number(item.previouslyAcceptedQty || 0),

                pendingQuantity:
                    Number(item.pendingQuantity || 0),

                remainingQuantity:
                    item.remainingQuantity ??
                    item.orderedQuantity,

                unit: item.unit,
                unitPrice: item.unitPrice,
                validFrom: item.validFrom,
                validTo: item.validTo
            }));

        } catch (error) {
            console.error(
                'Failed to load Purchase Order Items:',
                error.message
            );

            return req.error(
                502,
                'Unable to load Purchase Order Items.'
            );
        }
    });

    this.before('CREATE', 'ServiceEntrySheets', async (req) => {
        console.log('Creating Service Entry Sheet');

        if (!req.data.sesNumber) {
            req.data.sesNumber =
                await generateSESNumber(cds.tx(req));
        }

        req.data.status = 'Draft';

        req.data.netAmount = 0;
        req.data.taxAmount = 0;
        req.data.grossAmount = 0;

        if (!req.data.poNumber) {
            return req.error(
                400,
                'Purchase Order Number is required.'
            );
        }

        if (
            !req.data.description ||
            String(req.data.description).trim() === ''
        ) {
            return req.error(
                400,
                'Description is required.'
            );
        }

        if (
            !req.data.department ||
            String(req.data.department).trim() === ''
        ) {
            return req.error(
                400,
                'Department is required.'
            );
        }

        if (
            !req.data.serviceReceiver ||
            String(req.data.serviceReceiver).trim() === ''
        ) {
            return req.error(
                400,
                'Service Receiver is required.'
            );
        }

        try {
            const po = await getPurchaseOrder(
                req.data.poNumber
            );

            if (po.status !== 'Approved') {
                return req.error(
                    400,
                    `Purchase Order ${po.poNumber} is not Approved.`
                );
            }

            req.data.poNumber = po.poNumber;
            req.data.vendor = po.vendor;
            req.data.currency = po.currency;

            req.data.servicePeriodFrom = po.poDate;
            req.data.servicePeriodTo = po.deliveryDate;

            if (Array.isArray(req.data.items)) {
                const mappedSES = {
                    poNumber: req.data.poNumber,
                    vendor: req.data.vendor,
                    currency: req.data.currency,
                    servicePeriodFrom:
                        req.data.servicePeriodFrom,
                    servicePeriodTo:
                        req.data.servicePeriodTo
                };

                mapPOToSES(po, mappedSES);

                if (req.data.items.length === 0) {
                    req.data.items = mappedSES.items;
                }
            }

            console.log(
                'PO mapped successfully:',
                req.data.poNumber
            );

        } catch (error) {
            console.error(
                'PO mapping failed:',
                error.message
            );

            return req.error(
                400,
                error.message
            );
        }
    });

    this.before('CREATE', 'ServiceEntrySheetItems', async (req) => {
        const data = req.data;

        const quantity =
            Number(data.serviceEntryQuantity || 0);

        if (quantity <= 0) {
            return req.error(
                400,
                'Service Entry Quantity must be greater than zero.'
            );
        }

        const unitPrice =
            Number(data.unitPrice || 0);

        if (unitPrice <= 0) {
            return req.error(
                400,
                'Unit Price must be greater than zero.'
            );
        }

        if (!data.poItemNumber) {
            return req.error(
                400,
                'PO Item Number is required.'
            );
        }

        if (!data.serviceCode) {
            return req.error(
                400,
                'Service Code is required.'
            );
        }

        if (!data.serviceDescription) {
            return req.error(
                400,
                'Service Description is required.'
            );
        }

        if (!data.unit) {
            return req.error(
                400,
                'Unit is required.'
            );
        }

        if (
            data.pendingQuantity !== undefined &&
            data.pendingQuantity !== null
        ) {
            const pending =
                Number(data.pendingQuantity);

            if (quantity > pending) {
                return req.error(
                    400,
                    `Service Entry Quantity (${quantity}) cannot exceed pending quantity (${pending}).`
                );
            }

            data.remainingQuantity =
                Math.max(pending - quantity, 0);
        }

        const amounts =
            calculateItemAmounts({
                serviceEntryQuantity: quantity,
                unitPrice
            });

        data.netAmount = amounts.netAmount;
        data.taxAmount = amounts.taxAmount;
        data.grossAmount = amounts.grossAmount;
    });

    this.before('UPDATE', 'ServiceEntrySheets', async (req) => {
        if (!req.data.ID) {
            return;
        }

        const tx = cds.tx(req);

        const existing = await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: req.data.ID
                })
        );

        if (!existing) {
            return req.error(
                404,
                'Service Entry Sheet not found.'
            );
        }

        if (existing.status !== 'Draft') {
            return req.error(
                400,
                'Only Draft Service Entry Sheets can be edited.'
            );
        }

        const description =
            req.data.description ??
            existing.description;

        const department =
            req.data.department ??
            existing.department;

        const serviceReceiver =
            req.data.serviceReceiver ??
            existing.serviceReceiver;

        if (
            !description ||
            String(description).trim() === ''
        ) {
            return req.error(
                400,
                'Description is required.'
            );
        }

        if (
            !department ||
            String(department).trim() === ''
        ) {
            return req.error(
                400,
                'Department is required.'
            );
        }

        if (
            !serviceReceiver ||
            String(serviceReceiver).trim() === ''
        ) {
            return req.error(
                400,
                'Service Receiver is required.'
            );
        }

        if (
            req.data.sesNumber !== undefined &&
            req.data.sesNumber !== existing.sesNumber
        ) {
            return req.error(
                400,
                'SES Number cannot be changed.'
            );
        }

        if (
            req.data.status !== undefined &&
            req.data.status !== 'Draft'
        ) {
            return req.error(
                400,
                'SES status is controlled by the workflow.'
            );
        }
    });

    this.before('CREATE', 'ServiceEntrySheetItems', async (req) => {
        const data = req.data;

        const quantity =
            Number(data.serviceEntryQuantity || 0);

        const unitPrice =
            Number(data.unitPrice || 0);

        if (quantity <= 0) {
            return req.error(
                400,
                'Service Entry Quantity must be greater than zero.'
            );
        }

        if (unitPrice <= 0) {
            return req.error(
                400,
                'Unit Price must be greater than zero.'
            );
        }

        if (!data.poItemNumber) {
            return req.error(
                400,
                'PO Item Number is required.'
            );
        }

        if (!data.serviceCode) {
            return req.error(
                400,
                'Service Code is required.'
            );
        }

        if (!data.serviceDescription) {
            return req.error(
                400,
                'Service Description is required.'
            );
        }

        if (!data.unit) {
            return req.error(
                400,
                'Unit is required.'
            );
        }

        if (
            data.pendingQuantity !== undefined &&
            data.pendingQuantity !== null
        ) {
            const pending =
                Number(data.pendingQuantity);

            if (quantity > pending) {
                return req.error(
                    400,
                    `Service Entry Quantity (${quantity}) cannot exceed pending quantity (${pending}).`
                );
            }

            data.remainingQuantity =
                Math.max(pending - quantity, 0);
        }

        const amounts =
            calculateItemAmounts({
                serviceEntryQuantity: quantity,
                unitPrice
            });

        data.netAmount = amounts.netAmount;
        data.taxAmount = amounts.taxAmount;
        data.grossAmount = amounts.grossAmount;
    });

    this.before('UPDATE', 'ServiceEntrySheetItems', async (req) => {
        const data = req.data;

        if (!req.data.ID) {
            return;
        }

        const tx = cds.tx(req);

        const existing = await tx.run(
            SELECT.one
                .from(ServiceEntrySheetItems)
                .where({
                    ID: req.data.ID
                })
        );

        if (!existing) {
            return req.error(
                404,
                'Service Entry Sheet Item not found.'
            );
        }

        const quantity =
            Number(
                data.serviceEntryQuantity ??
                existing.serviceEntryQuantity ??
                0
            );

        const unitPrice =
            Number(
                data.unitPrice ??
                existing.unitPrice ??
                0
            );

        const pendingQuantity =
            Number(
                data.pendingQuantity ??
                existing.pendingQuantity ??
                0
            );

        if (quantity <= 0) {
            return req.error(
                400,
                'Service Entry Quantity must be greater than zero.'
            );
        }

        if (unitPrice <= 0) {
            return req.error(
                400,
                'Unit Price must be greater than zero.'
            );
        }

        if (quantity > pendingQuantity) {
            return req.error(
                400,
                `Service Entry Quantity (${quantity}) cannot exceed pending quantity (${pendingQuantity}).`
            );
        }

        data.remainingQuantity =
            Math.max(
                pendingQuantity - quantity,
                0
            );

        const amounts =
            calculateItemAmounts({
                serviceEntryQuantity: quantity,
                unitPrice
            });

        data.netAmount = amounts.netAmount;
        data.taxAmount = amounts.taxAmount;
        data.grossAmount = amounts.grossAmount;
    });

    this.on('submit', 'ServiceEntrySheets', async (req) => {
        const tx = cds.tx(req);
        const id = req.params[0]?.ID;

        if (!id) {
            return req.error(
                400,
                'Service Entry Sheet ID is required.'
            );
        }

        const ses = await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );

        if (!ses) {
            return req.error(
                404,
                'Service Entry Sheet not found.'
            );
        }

        if (ses.status !== 'Draft') {
            return req.error(
                400,
                'Only Draft Service Entry Sheets can be submitted.'
            );
        }

        if (!ses.poNumber) {
            return req.error(
                400,
                'Purchase Order Number is required.'
            );
        }

        if (!ses.vendor) {
            return req.error(
                400,
                'Vendor is required.'
            );
        }

        if (!ses.serviceReceiver) {
            return req.error(
                400,
                'Service Receiver is required.'
            );
        }

        if (!ses.department) {
            return req.error(
                400,
                'Department is required.'
            );
        }

        if (!ses.currency) {
            return req.error(
                400,
                'Currency is required.'
            );
        }

        if (!ses.servicePeriodFrom) {
            return req.error(
                400,
                'Service Period From is required.'
            );
        }

        if (!ses.servicePeriodTo) {
            return req.error(
                400,
                'Service Period To is required.'
            );
        }

        const fromDate =
            new Date(ses.servicePeriodFrom);

        const toDate =
            new Date(ses.servicePeriodTo);

        if (fromDate > toDate) {
            return req.error(
                400,
                'Service Period From cannot be later than Service Period To.'
            );
        }

        if (
            !ses.description ||
            String(ses.description).trim().length < 10
        ) {
            return req.error(
                400,
                'Description must contain at least 10 characters.'
            );
        }

        const items = await tx.run(
            SELECT
                .from(ServiceEntrySheetItems)
                .where({
                    ses_ID: id
                })
        );

        if (!items.length) {
            return req.error(
                400,
                'At least one Service Entry Sheet item is required.'
            );
        }

        if (items.length > MAX_SES_ITEMS) {
            return req.error(
                400,
                `A Service Entry Sheet cannot contain more than ${MAX_SES_ITEMS} items.`
            );
        }

        const poItems = new Set();

        let netAmount = 0;
        let taxAmount = 0;
        let grossAmount = 0;

        for (const item of items) {
            if (!item.poItemNumber) {
                return req.error(
                    400,
                    'PO Item Number is required for every SES item.'
                );
            }

            if (poItems.has(item.poItemNumber)) {
                return req.error(
                    400,
                    `Duplicate PO Item Number '${item.poItemNumber}' is not allowed in the same SES.`
                );
            }

            poItems.add(item.poItemNumber);

            if (!item.serviceCode) {
                return req.error(
                    400,
                    `Service Code is required for PO Item ${item.poItemNumber}.`
                );
            }

            if (!item.serviceDescription) {
                return req.error(
                    400,
                    `Service Description is required for PO Item ${item.poItemNumber}.`
                );
            }

            if (!item.unit) {
                return req.error(
                    400,
                    `Unit is required for PO Item ${item.poItemNumber}.`
                );
            }

            const quantity =
                Number(item.serviceEntryQuantity || 0);

            if (quantity <= 0) {
                return req.error(
                    400,
                    `Service Entry Quantity must be greater than zero for PO Item ${item.poItemNumber}.`
                );
            }

            const pendingQuantity =
                Number(item.pendingQuantity || 0);

            if (quantity > pendingQuantity) {
                return req.error(
                    400,
                    `Service Entry Quantity (${quantity}) cannot exceed pending quantity (${pendingQuantity}) for PO Item ${item.poItemNumber}.`
                );
            }

            const unitPrice =
                Number(item.unitPrice || 0);

            if (unitPrice <= 0) {
                return req.error(
                    400,
                    `Unit Price must be greater than zero for PO Item ${item.poItemNumber}.`
                );
            }

            const amounts =
                calculateItemAmounts({
                    serviceEntryQuantity: quantity,
                    unitPrice
                });

            await tx.run(
                UPDATE(ServiceEntrySheetItems)
                    .set({
                        netAmount: amounts.netAmount,
                        taxAmount: amounts.taxAmount,
                        grossAmount: amounts.grossAmount,
                        remainingQuantity:
                            Math.max(
                                pendingQuantity - quantity,
                                0
                            )
                    })
                    .where({
                        ID: item.ID
                    })
            );

            netAmount += amounts.netAmount;
            taxAmount += amounts.taxAmount;
            grossAmount += amounts.grossAmount;
        }

        netAmount =
            Number(netAmount.toFixed(2));

        taxAmount =
            Number(taxAmount.toFixed(2));

        grossAmount =
            Number(grossAmount.toFixed(2));

        if (grossAmount <= MIN_SES_GROSS_AMOUNT) {
            return req.error(
                400,
                `Service Entry Sheet Total Amount must be greater than ₹${MIN_SES_GROSS_AMOUNT}.`
            );
        }

        const approver =
            determineApprover(grossAmount);

        await tx.run(
            UPDATE(ServiceEntrySheets)
                .set({
                    netAmount,
                    taxAmount,
                    grossAmount,
                    approver,
                    status: 'Submitted',
                    submittedAt: new Date(),
                    submittedBy: getCurrentUser(req)
                })
                .where({
                    ID: id
                })
        );

        await tx.run(
            INSERT.into(StatusHistory)
                .entries({
                    ses_ID: id,
                    oldStatus: 'Draft',
                    newStatus: 'Submitted',
                    user: getCurrentUser(req),
                    timestamp: new Date(),
                    comments:
                        `Submitted for approval to ${approver}`
                })
        );

        console.log(
            `SES ${ses.sesNumber} submitted successfully.`
        );

        return await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );
    });

    this.on('approve', 'ServiceEntrySheets', async (req) => {
        const tx = cds.tx(req);
        const id = req.params[0]?.ID;

        if (!id) {
            return req.error(
                400,
                'Service Entry Sheet ID is required.'
            );
        }

        const ses = await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );

        if (!ses) {
            return req.error(
                404,
                'Service Entry Sheet not found.'
            );
        }

        if (ses.status !== 'Submitted') {
            return req.error(
                400,
                'Only Submitted Service Entry Sheets can be approved.'
            );
        }

        if (
            ses.submittedBy &&
            ses.submittedBy === getCurrentUser(req)
        ) {
            return req.error(
                400,
                'Requester cannot approve their own Service Entry Sheet.'
            );
        }

        const result = await tx.run(
            UPDATE(ServiceEntrySheets)
                .set({
                    status: 'Approved',
                    approvalComments: req.data?.comments,
                    approvedBy: getCurrentUser(req),
                    approvedAt: new Date()
                })
                .where({
                    ID: id,
                    status: 'Submitted'
                })
        );

        if (!result) {
            return req.error(
                409,
                'Service Entry Sheet could not be approved because its status changed.'
            );
        }

        await tx.run(
            INSERT.into(StatusHistory)
                .entries({
                    ses_ID: id,
                    oldStatus: 'Submitted',
                    newStatus: 'Approved',
                    user: getCurrentUser(req),
                    timestamp: new Date(),
                    comments: req.data?.comments
                })
        );

        console.log(
            `SES ${ses.sesNumber} approved.`
        );

        return await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );
    });

    this.on('reject', 'ServiceEntrySheets', async (req) => {
        const tx = cds.tx(req);
        const id = req.params[0]?.ID;

        const reason =
            String(req.data?.reason || '').trim();

        if (reason.length < 20) {
            return req.error(
                400,
                'Rejection comments must contain at least 20 characters.'
            );
        }

        const ses = await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );

        if (!ses) {
            return req.error(
                404,
                'Service Entry Sheet not found.'
            );
        }

        if (ses.status !== 'Submitted') {
            return req.error(
                400,
                'Only Submitted Service Entry Sheets can be rejected.'
            );
        }

        await tx.run(
            UPDATE(ServiceEntrySheets)
                .set({
                    status: 'Rejected',
                    rejectionComments: reason,
                    rejectedBy: getCurrentUser(req),
                    rejectedAt: new Date()
                })
                .where({
                    ID: id,
                    status: 'Submitted'
                })
        );

        await tx.run(
            INSERT.into(StatusHistory)
                .entries({
                    ses_ID: id,
                    oldStatus: 'Submitted',
                    newStatus: 'Rejected',
                    user: getCurrentUser(req),
                    timestamp: new Date(),
                    comments: reason
                })
        );

        console.log(
            `SES ${ses.sesNumber} rejected.`
        );

        return await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );
    });

    this.on('cancel', 'ServiceEntrySheets', async (req) => {
        const tx = cds.tx(req);
        const id = req.params[0]?.ID;

        const ses = await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );

        if (!ses) {
            return req.error(
                404,
                'Service Entry Sheet not found.'
            );
        }

        if (
            ses.status !== 'Draft' &&
            ses.status !== 'Submitted'
        ) {
            return req.error(
                400,
                'Only Draft or Submitted Service Entry Sheets can be cancelled.'
            );
        }

        const oldStatus = ses.status;

        await tx.run(
            UPDATE(ServiceEntrySheets)
                .set({
                    status: 'Cancelled',
                    cancelledBy: getCurrentUser(req),
                    cancelledAt: new Date()
                })
                .where({
                    ID: id
                })
        );

        await tx.run(
            INSERT.into(StatusHistory)
                .entries({
                    ses_ID: id,
                    oldStatus,
                    newStatus: 'Cancelled',
                    user: getCurrentUser(req),
                    timestamp: new Date()
                })
        );

        console.log(
            `SES ${ses.sesNumber} cancelled.`
        );

        return await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );
    });

    this.on('resubmit', 'ServiceEntrySheets', async (req) => {
        const tx = cds.tx(req);
        const id = req.params[0]?.ID;

        const ses = await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );

        if (!ses) {
            return req.error(
                404,
                'Service Entry Sheet not found.'
            );
        }

        if (ses.status !== 'Rejected') {
            return req.error(
                400,
                'Only Rejected Service Entry Sheets can be resubmitted.'
            );
        }

        await tx.run(
            UPDATE(ServiceEntrySheets)
                .set({
                    status: 'Draft',
                    rejectionComments: null,
                    rejectedBy: null,
                    rejectedAt: null,
                    approver: null,
                    submittedBy: null,
                    submittedAt: null
                })
                .where({
                    ID: id
                })
        );

        await tx.run(
            INSERT.into(StatusHistory)
                .entries({
                    ses_ID: id,
                    oldStatus: 'Rejected',
                    newStatus: 'Draft',
                    user: getCurrentUser(req),
                    timestamp: new Date(),
                    comments:
                        'Service Entry Sheet resubmitted for correction.'
                })
        );

        console.log(
            `SES ${ses.sesNumber} moved back to Draft.`
        );

        return await tx.run(
            SELECT.one
                .from(ServiceEntrySheets)
                .where({
                    ID: id
                })
        );
    });

    console.log('SES business logic registered');
});