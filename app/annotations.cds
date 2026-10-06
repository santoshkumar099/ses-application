using ServiceEntrySheetService from '../srv/ses-service';


/*
 * ============================================================
 * SERVICE ENTRY SHEET - HEADER
 * ============================================================
 */

annotate ServiceEntrySheetService.ServiceEntrySheets with @(
    UI.HeaderInfo : {
        TypeName       : 'Service Entry Sheet',
        TypeNamePlural : 'Service Entry Sheets',

        Title : {
            $Type : 'UI.DataField',
            Label : 'SES Number',
            Value : sesNumber
        },

        Description : {
            $Type : 'UI.DataField',
            Label : 'Purchase Order',
            Value : poNumber
        }
    },

    /*
     * ========================================================
     * LIST PAGE
     * ========================================================
     */

    UI.LineItem : [

        {
            $Type : 'UI.DataField',
            Value : sesNumber,
            Label : 'SES Number'
        },

        {
            $Type : 'UI.DataField',
            Value : poNumber,
            Label : 'Purchase Order'
        },

        {
            $Type : 'UI.DataField',
            Value : vendor,
            Label : 'Vendor'
        },

        {
            $Type : 'UI.DataField',
            Value : serviceReceiver,
            Label : 'Service Receiver'
        },

        {
            $Type : 'UI.DataField',
            Value : department,
            Label : 'Department'
        },

        {
            $Type : 'UI.DataField',
            Value : servicePeriodFrom,
            Label : 'Service From'
        },

        {
            $Type : 'UI.DataField',
            Value : servicePeriodTo,
            Label : 'Service To'
        },

        {
            $Type : 'UI.DataField',
            Value : currency,
            Label : 'Currency'
        },

        {
            $Type : 'UI.DataField',
            Value : grossAmount,
            Label : 'Gross Amount'
        },

        {
            $Type : 'UI.DataField',
            Value : status,
            Label : 'Status'
        }
    ],


    /*
     * ========================================================
     * OBJECT PAGE FACETS
     * ========================================================
     */

    UI.Facets : [

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'SESInformationFacet',
            Label : 'SES Information',
            Target : '@UI.FieldGroup#SESInformation'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ServiceInformationFacet',
            Label : 'Service Information',
            Target : '@UI.FieldGroup#ServiceInformation'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'AmountInformationFacet',
            Label : 'Amount Information',
            Target : '@UI.FieldGroup#AmountInformation'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ItemsFacet',
            Label : 'Service Entry Items',
            Target : 'items/@UI.LineItem'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ApprovalInformationFacet',
            Label : 'Approval Information',
            Target : '@UI.FieldGroup#ApprovalInformation'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'StatusHistoryFacet',
            Label : 'Status History',
            Target : 'statusHistory/@UI.LineItem'
        }
    ],


    /*
     * ========================================================
     * SES INFORMATION
     * ========================================================
     */

    UI.FieldGroup #SESInformation : {
        $Type : 'UI.FieldGroupType',

        Data : [

            {
                $Type : 'UI.DataField',
                Value : sesNumber,
                Label : 'SES Number'
            },

            {
                $Type : 'UI.DataField',
                Value : poNumber,
                Label : 'Purchase Order'
            },

            {
                $Type : 'UI.DataField',
                Value : status,
                Label : 'Status'
            },

            {
                $Type : 'UI.DataField',
                Value : description,
                Label : 'Description'
            }
        ]
    },


    /*
     * ========================================================
     * SERVICE INFORMATION
     * ========================================================
     */

    UI.FieldGroup #ServiceInformation : {
        $Type : 'UI.FieldGroupType',

        Data : [

            {
                $Type : 'UI.DataField',
                Value : vendor,
                Label : 'Vendor'
            },

            {
                $Type : 'UI.DataField',
                Value : serviceReceiver,
                Label : 'Service Receiver'
            },

            {
                $Type : 'UI.DataField',
                Value : department,
                Label : 'Department'
            },

            {
                $Type : 'UI.DataField',
                Value : servicePeriodFrom,
                Label : 'Service Period From'
            },

            {
                $Type : 'UI.DataField',
                Value : servicePeriodTo,
                Label : 'Service Period To'
            },

            {
                $Type : 'UI.DataField',
                Value : currency,
                Label : 'Currency'
            }
        ]
    },


    /*
     * ========================================================
     * AMOUNT INFORMATION
     * ========================================================
     */

    UI.FieldGroup #AmountInformation : {
        $Type : 'UI.FieldGroupType',

        Data : [

            {
                $Type : 'UI.DataField',
                Value : netAmount,
                Label : 'Net Amount'
            },

            {
                $Type : 'UI.DataField',
                Value : taxAmount,
                Label : 'Tax Amount'
            },

            {
                $Type : 'UI.DataField',
                Value : grossAmount,
                Label : 'Gross Amount'
            }
        ]
    },


    /*
     * ========================================================
     * APPROVAL INFORMATION
     * ========================================================
     */

    UI.FieldGroup #ApprovalInformation : {
        $Type : 'UI.FieldGroupType',

        Data : [

            {
                $Type : 'UI.DataField',
                Value : approver,
                Label : 'Approver'
            },

            {
                $Type : 'UI.DataField',
                Value : approvalComments,
                Label : 'Approval Comments'
            },

            {
                $Type : 'UI.DataField',
                Value : rejectionComments,
                Label : 'Rejection Comments'
            },

            {
                $Type : 'UI.DataField',
                Value : submittedBy,
                Label : 'Submitted By'
            },

            {
                $Type : 'UI.DataField',
                Value : submittedAt,
                Label : 'Submitted At'
            },

            {
                $Type : 'UI.DataField',
                Value : approvedBy,
                Label : 'Approved By'
            },

            {
                $Type : 'UI.DataField',
                Value : approvedAt,
                Label : 'Approved At'
            },

            {
                $Type : 'UI.DataField',
                Value : rejectedBy,
                Label : 'Rejected By'
            },

            {
                $Type : 'UI.DataField',
                Value : rejectedAt,
                Label : 'Rejected At'
            },

            {
                $Type : 'UI.DataField',
                Value : cancelledBy,
                Label : 'Cancelled By'
            },

            {
                $Type : 'UI.DataField',
                Value : cancelledAt,
                Label : 'Cancelled At'
            }
        ]
    }
);


/*
 * ============================================================
 * HEADER FIELD CONTROL
 * ============================================================
 */

annotate ServiceEntrySheetService.ServiceEntrySheets with {

    sesNumber
        @UI.ReadOnly
        @Core.Computed;

    status
        @UI.ReadOnly;

    vendor
        @UI.ReadOnly;

    currency
        @UI.ReadOnly;

    netAmount
        @UI.ReadOnly;

    taxAmount
        @UI.ReadOnly;

    grossAmount
        @UI.ReadOnly;

    approver
        @UI.ReadOnly;

    submittedBy
        @UI.ReadOnly;

    submittedAt
        @UI.ReadOnly;

    approvedBy
        @UI.ReadOnly;

    approvedAt
        @UI.ReadOnly;

    rejectedBy
        @UI.ReadOnly;

    rejectedAt
        @UI.ReadOnly;

    cancelledBy
        @UI.ReadOnly;

    cancelledAt
        @UI.ReadOnly;
};


/*
 * ============================================================
 * HEADER FIELD CONTROL - COMMON
 * ============================================================
 */

annotate ServiceEntrySheetService.ServiceEntrySheets with {

    sesNumber
        @Common.FieldControl : #ReadOnly;

    status
        @Common.FieldControl : #ReadOnly;

    vendor
        @Common.FieldControl : #ReadOnly;

    currency
        @Common.FieldControl : #ReadOnly;

    netAmount
        @Common.FieldControl : #ReadOnly;

    taxAmount
        @Common.FieldControl : #ReadOnly;

    grossAmount
        @Common.FieldControl : #ReadOnly;

    approver
        @Common.FieldControl : #ReadOnly;

    submittedBy
        @Common.FieldControl : #ReadOnly;

    submittedAt
        @Common.FieldControl : #ReadOnly;

    approvedBy
        @Common.FieldControl : #ReadOnly;

    approvedAt
        @Common.FieldControl : #ReadOnly;

    rejectedBy
        @Common.FieldControl : #ReadOnly;

    rejectedAt
        @Common.FieldControl : #ReadOnly;

    cancelledBy
        @Common.FieldControl : #ReadOnly;

    cancelledAt
        @Common.FieldControl : #ReadOnly;
};


/*
 * ============================================================
 * SERVICE ENTRY SHEET ITEMS
 * ============================================================
 */

annotate ServiceEntrySheetService.ServiceEntrySheetItems with @(
    
    UI.LineItem : [

        {
            $Type : 'UI.DataField',
            Value : poItemNumber,
            Label : 'PO Item Number'
        },

        {
            $Type : 'UI.DataField',
            Value : serviceCode,
            Label : 'Service Code'
        },

        {
            $Type : 'UI.DataField',
            Value : serviceDescription,
            Label : 'Service Description'
        },

        {
            $Type : 'UI.DataField',
            Value : orderedQuantity,
            Label : 'Ordered Quantity'
        },

        {
            $Type : 'UI.DataField',
            Value : previouslyAcceptedQty,
            Label : 'Previously Accepted'
        },

        {
            $Type : 'UI.DataField',
            Value : pendingQuantity,
            Label : 'Pending Quantity'
        },

        {
            $Type : 'UI.DataField',
            Value : remainingQuantity,
            Label : 'Remaining Quantity'
        },

        {
            $Type : 'UI.DataField',
            Value : serviceEntryQuantity,
            Label : 'Service Entry Quantity'
        },

        {
            $Type : 'UI.DataField',
            Value : unit,
            Label : 'Unit'
        },

        {
            $Type : 'UI.DataField',
            Value : unitPrice,
            Label : 'Unit Price'
        },

        {
            $Type : 'UI.DataField',
            Value : netAmount,
            Label : 'Net Amount'
        },

        {
            $Type : 'UI.DataField',
            Value : taxAmount,
            Label : 'Tax Amount'
        },

        {
            $Type : 'UI.DataField',
            Value : grossAmount,
            Label : 'Gross Amount'
        }
    ],


    /*
     * ========================================================
     * ITEM HEADER
     * ========================================================
     */

    UI.HeaderInfo : {

        TypeName : 'Service Entry Sheet Item',

        TypeNamePlural : 'Service Entry Sheet Items',

        Title : {
            $Type : 'UI.DataField',
            Label : 'PO Item',
            Value : poItemNumber
        },

        Description : {
            $Type : 'UI.DataField',
            Label : 'Service',
            Value : serviceDescription
        }
    },


    /*
     * ========================================================
     * ITEM OBJECT PAGE
     * ========================================================
     */

    UI.Facets : [

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ItemInformationFacet',
            Label : 'Item Information',
            Target : '@UI.FieldGroup#ItemInformation'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'QuantityInformationFacet',
            Label : 'Quantity Information',
            Target : '@UI.FieldGroup#QuantityInformation'
        },

        {
            $Type : 'UI.ReferenceFacet',
            ID : 'ItemAmountFacet',
            Label : 'Amount Information',
            Target : '@UI.FieldGroup#ItemAmountInformation'
        }
    ],


    UI.FieldGroup #ItemInformation : {

        $Type : 'UI.FieldGroupType',

        Data : [

            {
                $Type : 'UI.DataField',
                Value : poItemNumber,
                Label : 'PO Item Number'
            },

            {
                $Type : 'UI.DataField',
                Value : serviceCode,
                Label : 'Service Code'
            },

            {
                $Type : 'UI.DataField',
                Value : serviceDescription,
                Label : 'Service Description'
            },

            {
                $Type : 'UI.DataField',
                Value : unit,
                Label : 'Unit'
            }
        ]
    },


    UI.FieldGroup #QuantityInformation : {

        $Type : 'UI.FieldGroupType',

        Data : [

            {
                $Type : 'UI.DataField',
                Value : orderedQuantity,
                Label : 'Ordered Quantity'
            },

            {
                $Type : 'UI.DataField',
                Value : previouslyAcceptedQty,
                Label : 'Previously Accepted'
            },

            {
                $Type : 'UI.DataField',
                Value : pendingQuantity,
                Label : 'Pending Quantity'
            },

            {
                $Type : 'UI.DataField',
                Value : remainingQuantity,
                Label : 'Remaining Quantity'
            },

            {
                $Type : 'UI.DataField',
                Value : serviceEntryQuantity,
                Label : 'Service Entry Quantity'
            }
        ]
    },


    UI.FieldGroup #ItemAmountInformation : {

        $Type : 'UI.FieldGroupType',

        Data : [

            {
                $Type : 'UI.DataField',
                Value : unitPrice,
                Label : 'Unit Price'
            },

            {
                $Type : 'UI.DataField',
                Value : netAmount,
                Label : 'Net Amount'
            },

            {
                $Type : 'UI.DataField',
                Value : taxAmount,
                Label : 'Tax Amount'
            },

            {
                $Type : 'UI.DataField',
                Value : grossAmount,
                Label : 'Gross Amount'
            }
        ]
    }
);


/*
 * ============================================================
 * ITEM FIELD CONTROL
 * ============================================================
 */

annotate ServiceEntrySheetService.ServiceEntrySheetItems with {

    poItemNumber
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    serviceCode
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    serviceDescription
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    orderedQuantity
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    previouslyAcceptedQty
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    pendingQuantity
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    remainingQuantity
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    unit
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    unitPrice
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    netAmount
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    taxAmount
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;

    grossAmount
        @UI.ReadOnly
        @Common.FieldControl : #ReadOnly;
};


/*
 * ============================================================
 * STATUS HISTORY
 * ============================================================
 */

annotate ServiceEntrySheetService.StatusHistory with @(

    UI.LineItem : [

        {
            $Type : 'UI.DataField',
            Value : oldStatus,
            Label : 'Old Status'
        },

        {
            $Type : 'UI.DataField',
            Value : newStatus,
            Label : 'New Status'
        },

        {
            $Type : 'UI.DataField',
            Value : user,
            Label : 'User'
        },

        {
            $Type : 'UI.DataField',
            Value : timestamp,
            Label : 'Timestamp'
        },

        {
            $Type : 'UI.DataField',
            Value : comments,
            Label : 'Comments'
        }
    ]
);


/*
 * ============================================================
 * ACTIONS
 * ============================================================
 */

annotate ServiceEntrySheetService.ServiceEntrySheets with @(
    
    UI.Identification : [

        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ServiceEntrySheetService.submitRequest',
            Label : 'Submit'
        },

        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ServiceEntrySheetService.approveRequest',
            Label : 'Approve'
        },

        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ServiceEntrySheetService.rejectRequest',
            Label : 'Reject'
        },

        {
            $Type : 'UI.DataFieldForAction',
            Action : 'ServiceEntrySheetService.cancelRequest',
            Label : 'Cancel'
        }
        
    ]

    
);


// using ServiceEntrySheetService from '../srv/ses-service';
// using com.sap.vocabularies.Common.v1 as Common;

annotate ServiceEntrySheetService.ServiceEntrySheets with {
    poNumber @Common.ValueList : {
        $Type: 'Common.ValueListType',
        CollectionPath: 'PurchaseOrders',
        Parameters: [
            {
                $Type: 'Common.ValueListParameterInOut',
                LocalDataProperty: poNumber,
                ValueListProperty: 'poNumber'
            }
        ]
    };
};