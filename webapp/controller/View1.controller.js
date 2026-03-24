sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("serviceapproval.controller.View1", {

       
        onInit: function () {
            this.getView().setModel(
                new JSONModel({
                    detailsLoaded: false
                }),
                "ui"
            );
        },

        /* LOAD DETAILS  */
        onLoadDetails: function () {

            var sSheet = this.byId("idSheet").getValue();
            if (!sSheet) {
                MessageBox.warning("Please enter Service Sheet Number");
                return;
            }

            var oView  = this.getView();
            var oModel = oView.getModel();

            oView.setBusy(true);

            /*  ITEMS  */
            oModel.read("/SESItemSet", {
                filters: [
                    new Filter("EntrSheet", FilterOperator.EQ, sSheet)
                ],
                success: function (oData) {
                    oView.setModel(
                        new JSONModel(oData.results),
                        "items"
                    );

                    //   details viewed
                    oView.getModel("ui").setProperty("/detailsLoaded", true);

                    oView.setBusy(false);
                },
                error: function () {
                    oView.setBusy(false);
                    MessageBox.error("Failed to load Service Entry Items");
                }
            });

            /* -------- HEADER (OPTIONAL – FUTURE USE)
            oModel.read("/ZET_SES_RESPSet('" + sSheet + "')", {
                success: function (oData) {
                    oView.setModel(new JSONModel(oData), "detail");
                }
            });
            -------- */
        },

        /*  APPROVE / REJECT  */
        onApprove: function () {
            this._callApproveReject("A");
        },

        onReject: function () {
            this._callApproveReject("R");
        },

        _callApproveReject: function (sAction) {

            var oView = this.getView();
            var oUI   = oView.getModel("ui");

            /* DETAILS MUST BE VIEWED */
            if (!oUI.getProperty("/detailsLoaded")) {
                MessageBox.warning(
                    "Please click Details and review the Service Sheet before Approve or Reject."
                );
                return;
            }

            var sUser  = this.byId("idUser").getValue();
            var sSheet = this.byId("idSheet").getValue();

            if (!sUser) {
                MessageBox.warning("Please enter User");
                return;
            }

            /* BACKEND CALL */
            var oModel = oView.getModel();
            oModel.setUseBatch(false);

            oView.setBusy(true);

            oModel.callFunction("/ApproveSERES", {
                method: "POST",
                urlParameters: {
                    EntrSheet: sSheet,
                    Action: sAction,
                    Uname: sUser
                },
                success: function () {
                    oView.setBusy(false);
                    MessageToast.show(
                        sAction === "A"
                            ? "Service Sheet Approved successfully"
                            : "Service Sheet Rejected successfully"
                    );
                },
                error: function () {
                    oView.setBusy(false);
                    MessageBox.error("Approval / Rejection failed");
                }
            });
        }
    });
});