/**
 * Copyright 2015 Solinea, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// LauncherView is a "wrapper view" that is NOT instantiated with
// an .el passed into the objects hash.
// This allows for it to be "apppended" to DOM
// and removed cleanly when switching views with .remove();
var LauncherView = Backbone.View.extend({
    initialize: function(options) {
        this.render();
    },

    render: function() {
        this.$el.html(this.template());
        return this;
    },

    // inner views will be bound to ".launcher-container" via
    // their .el property passed into the options hash.
    template: _.template('' +
        '<div class="launcher-container"></div>')
});

var GoldstoneRouter = Backbone.Router.extend({
    routes: {
        "api_perf/report": "apiPerfReport",
        "cinder/report": "cinderReport",
        "discover": "discover",
        "glance/report": "glanceReport",
        "help": "help",
        "intelligence/search": "logSearch",
        "keystone/report": "keystoneReport",
        "login": "login",
        "password": "password",
        "settings": "settings",
        "settings/tenants": "tenant",
        "neutron/report": "neutronReport",
        "nova/report": "novaReport",
        "report/node/:nodeId": "nodeReport",
        "*default": "redirect"
    },
    extendOptions: function(options, args) {
        _.each(args, function(item) {
            _.extend(options, item);
        });
        return options;
    },
    switchView: function(view) {

        // Capture any extra params that are passed in via the
        // router functions below, such as {node_uuid: nodeId} in
        // nodeReport.
        var args = Array.prototype.slice.call(arguments, 1);

        // as a backbone object, router can emit triggers
        // this is being listened to by authLogoutView
        // to determine whether or not to render the
        // logout icon
        this.trigger('switchingView');

        // prevent multiple successive calls to the same page
        if (app.switchTriggeredBy && app.switchTriggeredBy === view) {
            return;
        }
        app.switchTriggeredBy = view;

        if (app.currentLauncherView) {

            // app.currentView is instantiated below
            if (app.currentView.onClose) {

                // this is defined in goldstoneBaseView and
                // removes any setIntervals which would continue
                // to trigger events even after removing the view
                app.currentView.onClose();
            }

            // Backbone's remove() calls this.$el.remove() and
            // this.stopListening() which removes any events that
            // are subscribed to with listenTo()
            app.currentView.remove();
            app.currentLauncherView.remove();
        }

        // instantiate wrapper view that can be removed upon page
        // change and store the current launcher and view so it
        // can be remove()'d
        app.currentLauncherView = new LauncherView({});

        // append the launcher to the page div
        // .router-content-container is a div set in router.html
        $('.router-content-container').append(app.currentLauncherView.el);

        // new views will pass 'options' which at least designates
        // the .el to bind to
        var options = {
            el: '.launcher-container'
        };

        // but if additional objects have been passed in via the
        // functions below, add those to the options hash
        /*
        example: calling nodeReport(nodeId)
        will call switchView and pass in the NodeReportView,
        as well as an object similar to:{"node_uuid": "ctrl-01"}.
        options will be extended to be:
        {
            el: ".launcher-container",
            node_uuid: "ctrl-01"
        }
        */
        if (args.length) {
            options = this.extendOptions(options, args);
        }

        // instantiate the desired page view
        app.currentView = new view(options);

    },

    /*
    Define additional view launching functions below.
    Additional params that need to be passed to 'options' can
    be added as an object. The extra options will be extended


    */

    nodeReport: function(nodeId) {
        this.switchView(NodeReportView, {
            node_uuid: nodeId
        });
    },
    keystoneReport: function() {
        this.switchView(KeystoneReportView);
    },
    login: function() {
        this.switchView(LoginPageView);
    },
    password: function() {
        this.switchView(PasswordResetView);
    },
    settings: function() {
        this.switchView(SettingsPageView);
    },
    tenant: function() {
        this.switchView(TenantSettingsPageView);
    },
    apiPerfReport: function() {
        this.switchView(ApiPerfReportView);
    },
    novaReport: function() {
        this.switchView(NovaReportView);
    },
    neutronReport: function() {
        this.switchView(NeutronReportView);
    },
    cinderReport: function() {
        this.switchView(CinderReportView);
    },
    glanceReport: function() {
        this.switchView(GlanceReportView);
    },
    logSearch: function() {
        this.switchView(LogSearchView);
    },
    discover: function() {
        this.switchView(DiscoverView);
    },
    help: function() {
        this.switchView(HelpView);
    },
    redirect: function() {
        location.href = "#/discover";
    }
});
