/* global QUnit */
QUnit.config.autostart = false;

sap.ui.require(["serviceapproval/test/integration/AllJourneys"
], function () {
	QUnit.start();
});
