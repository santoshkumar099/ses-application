using ses from '../db/schema';

@path: 'ses'
@requires: 'authenticated-user'
service ServiceEntrySheetService {

    /*
     * ============================================================
     * Purchase Order Value Help / F4
     * ============================================================
     */

    entity PurchaseOrders {
        key poNumber       : String(20);
        vendor             : String(100);
        currency           : String(3);
        status             : String(20);
        validFrom          : Date;
        validTo            : Date;
        totalAmount        : Decimal(15,2);
    }


    /*
     * ============================================================
     * Purchase Order Items
     * ============================================================
     */

    entity PurchaseOrderItems {
        key poNumber           : String(20);
        key poItemNumber       : String(10);

        serviceCode            : String(50);
        serviceDescription     : String(500);

        orderedQuantity        : Decimal(15,3);
        previouslyAcceptedQty  : Decimal(15,3);
        pendingQuantity        : Decimal(15,3);
        remainingQuantity      : Decimal(15,3);

        unit                   : String(10);
        unitPrice              : Decimal(15,2);

        validFrom              : Date;
        validTo                : Date;
    }


    /*
     * ============================================================
     * SES
     * ============================================================
     */

    @odata.draft.enabled
    entity ServiceEntrySheets as projection on ses.ServiceEntrySheets
        actions {

            action submit()
                returns ServiceEntrySheets;

            action approve(comments: String)
                returns ServiceEntrySheets;

            action reject(reason: String)
                returns ServiceEntrySheets;

            action cancel()
                returns ServiceEntrySheets;

            action resubmit()
                returns ServiceEntrySheets;
        };


    /*
     * ============================================================
     * SES Items
     * ============================================================
     */

    entity ServiceEntrySheetItems
        as projection on ses.ServiceEntrySheetItems;


    /*
     * ============================================================
     * Status History
     * ============================================================
     */

    entity StatusHistory
        as projection on ses.StatusHistory;
}