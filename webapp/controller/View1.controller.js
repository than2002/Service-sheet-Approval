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
                    detailsLoaded: false,
                    currentSheet: ""
                }),
                "ui"
            );

            this.getView().setModel(new JSONModel([]), "items");
        },

        
      _getLoggedInUser: function () {
            var oUserInput = this.byId("idUser");
            if(oUserInput) {
                var sUser = oUserInput.getValue().trim();
                if(sUser){
                    return sUser.toUpperCase();
                }
            }    

            
            return "";
        },


        
        _extractErrorMessage: function (oError) {
            var sMessage = "Something went wrong";

            try {
                if (oError && oError.responseText) {
                    var oErrObj = JSON.parse(oError.responseText);

                    if (oErrObj.error && oErrObj.error.message && oErrObj.error.message.value) {
                        sMessage = oErrObj.error.message.value;
                    }

                    if (
                        oErrObj.error &&
                        oErrObj.error.innererror &&
                        oErrObj.error.innererror.errordetails &&
                        oErrObj.error.innererror.errordetails.length > 0
                    ) {
                        var aDetails = oErrObj.error.innererror.errordetails
                            .filter(function (oItem) {
                                return oItem.message;
                            })
                            .map(function (oItem) {
                                return oItem.message;
                            });

                        if (aDetails.length > 0) {
                            sMessage = aDetails.join("\n");
                        }
                    }
                } else if (oError && oError.message) {
                    sMessage = oError.message;
                }
            } catch (e) {
                
            }

            return sMessage;
        },

        
        _validateSheetInput: function () {
            var oInput = this.byId("idSheet");
            var sSheet = oInput.getValue().trim();

            oInput.setValue(sSheet);

            if (!sSheet) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Service Sheet Number is required");
                MessageBox.error("Please enter Service Sheet Number");
                return false;
            }

            if (!/^\d+$/.test(sSheet)) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Only numeric Service Sheet Number is allowed");
                MessageBox.error("Only numeric Service Sheet Number is allowed");
                return false;
            }

            if (sSheet.length < 8 || sSheet.length > 10) {
                oInput.setValueState("Error");
                oInput.setValueStateText("Enter valid Service Sheet Number");
                MessageBox.error("Enter valid Service Sheet Number");
                return false;
            }

            oInput.setValueState("None");
            oInput.setValueStateText("");
            return true;
        },

        
       
        onSheetLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();

            // allow only digits
            sValue = sValue.replace(/[^\d]/g, "");
            oInput.setValue(sValue);

            // disable approve/reject until details reloaded
            this.getView().getModel("ui").setProperty("/detailsLoaded", false);
            this.getView().getModel("ui").setProperty("/currentSheet", "");

            // clear old table data
            this.getView().getModel("items").setData([]);

            if (!sValue) {
                oInput.setValueState("None");
                oInput.setValueStateText("");
                return;
            }

            if (sValue.length < 8) {
                oInput.setValueState("Warning");
                oInput.setValueStateText("Service Sheet Number looks incomplete");
            } else {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }
        },

       
        // LOAD DETAILS
       
        onLoadDetails: function () {
            if (!this._validateSheetInput()) {
                return;
            }

            var oView = this.getView();
            var oModel = oView.getModel();
            var sSheet = this.byId("idSheet").getValue().trim();
            var that = this;

            oView.setBusy(true);

            oModel.read("/SESItemSet", {
                filters: [
                    new Filter("EntrSheet", FilterOperator.EQ, sSheet)
                ],
                success: function (oData) {
                    var aResults = oData.results || [];

                    if (aResults.length === 0) {
                        oView.setBusy(false);
                        oView.getModel("items").setData([]);
                        oView.getModel("ui").setProperty("/detailsLoaded", false);
                        oView.getModel("ui").setProperty("/currentSheet", "");
                        MessageBox.error("No data found for Service Sheet Number: " + sSheet);
                        return;
                    }

                    oView.getModel("items").setData(aResults);
                    oView.getModel("ui").setProperty("/detailsLoaded", true);
                    oView.getModel("ui").setProperty("/currentSheet", sSheet);
                    oView.setBusy(false);

                    MessageToast.show("Details loaded successfully");
                },
                error: function (oError) {
                    oView.setBusy(false);
                    oView.getModel("items").setData([]);
                    oView.getModel("ui").setProperty("/detailsLoaded", false);
                    oView.getModel("ui").setProperty("/currentSheet", "");

                    MessageBox.error(that._extractErrorMessage(oError));
                }
            });
        },

        // APPROVE
        
        onApprove: function () {
            this._callApproveReject("A");
        },

       
        // REJECT
      
        onReject: function () {
            this._callApproveReject("R");
        },

        
        _callApproveReject: function (sAction) {
            var oView = this.getView();
            var oUI = oView.getModel("ui");
            var that = this;

            if (!this._validateSheetInput()) {
                return;
            }

            if (!oUI.getProperty("/detailsLoaded")) {
                MessageBox.warning("Please click Details first.");
                return;
            }

            var sSheet = oView.byId("idSheet").getValue().trim();
            var sLoadedSheet = oUI.getProperty("/currentSheet");
            var sUser = this._getLoggedInUser();

            if (!sUser) {
                MessageBox.error("Unable to identify logged-in user. Please login again.");
                return;
            }

            if (sLoadedSheet !== sSheet) {
                MessageBox.warning("Please click Details again after changing Service Sheet Number.");
                oUI.setProperty("/detailsLoaded", false);
                return;
            }

            oView.setBusy(true);
            oView.getModel().setUseBatch(false);

            oView.getModel().callFunction("/ApproveSERES", {
                method: "POST",
                urlParameters: {
                    EntrSheet: sSheet,
                    Action: sAction,
                    Uname: sUser
                },
                success: function (oData) {
                    oView.setBusy(false);

                    var sMsg = "";
                    if (oData && oData.Message) {
                        sMsg = oData.Message;
                    }

                    MessageBox.success(
                        sMsg || (
                            sAction === "A"
                                ? "Service Sheet Approved successfully"
                                : "Service Sheet Rejected successfully"
                        )
                    );

                   
                    that._resetScreen();
                },
                error: function (oError) {
                    oView.setBusy(false);
                    MessageBox.error(that._extractErrorMessage(oError));
                }
            });
        },

        
        _resetScreen: function () {
            var oView = this.getView();

            oView.byId("idSheet").setValue("");
            oView.byId("idSheet").setValueState("None");
            oView.byId("idSheet").setValueStateText("");

            oView.getModel("items").setData([]);
            oView.getModel("ui").setProperty("/detailsLoaded", false);
            oView.getModel("ui").setProperty("/currentSheet", "");

            oView.byId("idSheet").focus();
        },
    });
});
