// e2e auth

// increase Default timeout for wait* family functions:
// default = 5000
casper.options.waitTimeout = 10000;

// default viewportSize inherited from PhantomJS: 400wx300h
casper.options.viewportSize = {
    width: 1430,
    height: 779
};

/*
Colors available via 2nd param of casper.echo:
ERROR: white text on red background
INFO: green text
TRACE: green text
PARAMETER: cyan text
COMMENT: yellow text
WARNING: red text
GREEN_BAR: white text on green background
RED_BAR: white text on red background
INFO_BAR: cyan text
WARN_BAR: white text on orange background
*/

/*
Must authorize prior to continuing to test:
*/

casper.test.begin('Login Page loads and I can log in', 11, function suite(test) {

    casper.start('http://localhost:8000/login', function() {
        test.assertTitle("goldstone", "title is goldstone");
        test.assertExists('#forgotUsername', "Forgot username or password text is present");

        // redirect to forgotten password page
        this.click('#forgotUsername a');
    });


    casper.waitForResource(function testResource(resource) {
        return resource.url.indexOf("password") > -1;
    }, function onReceived() {
        this.echo('redirect to /password successful!', "GREEN_BAR");
        test.assertExists('form.password-reset-form');
        this.echo('page url after redirect: ' + this.evaluate(function() {
            return document.location.href;
        }), "GREEN_BAR");

    });

    casper.then(function() {
        // alert-info bar should be empty
        test.assertExists('.alert.alert-info', 'alert info exists');
        test.assertSelectorHasText('.alert.alert-info', '', 'alert-info selector is empty');
        // submit password reset request
        this.fill('form.password-reset-form', {
            'email': "wizard@oz.org",
        }, true);
    });

    // after submitting password reset, wait for success popup
    casper.waitForSelectorTextChange('.alert.alert-info', function() {
        this.echo('Text in .alert-info has changed', "GREEN_BAR");
    });

    casper.then(function() {
        // alert-info bar should not empty
        test.assertExists('.alert.alert-info', 'alert info exists');
        test.assertSelectorHasText('.alert.alert-info', 'Password reset instructions have been emailed to you');
    });

    casper.then(function() {
        // redirect back to login page
        this.click('#cancelReset a');
    });

    casper.waitForResource(function testResource(resource) {
        return resource.url.indexOf("login") > -1;
    }, function onReceived() {
        this.echo('redirect back to /login successful!', "GREEN_BAR");
        test.assertExists('form.login-form');
        this.echo('page url after redirect: ' + this.evaluate(function() {
            return document.location.href;
        }), "GREEN_BAR");
    });


    casper.then(function() {

        test.assertExists('form [name="username"]', "username login field is found");
        test.assertExists('form [name="password"]', "password field on login form is found");

        // fill in form to initiate auth
        this.echo('login form values pre-fill: ' + this.evaluate(function() {
            return $('form [name="username"]').val() +
                ' ' +
                $('form [name="password"]').val();
        }), "GREEN_BAR");

        // fills in form with "field: value"
        // 'true/false' is whether to submit form
        this.fill('form.login-form', {
            'username': "alex",
            'password': "a"
        }, true);

        // what does the form say after submission?
        this.echo('login form values post-submit: ', "GREEN_BAR");
        this.echo('username: ' + this.getFormValues('form').username, "GREEN_BAR");
        this.echo('password: ' + this.getFormValues('form').password, "GREEN_BAR");

    });

    // wait for redirect to 'discover' to signify
    // successful login:
    casper.waitForResource(function testResource(resource) {
        return resource.url.indexOf("discover") > -1;
    }, function onReceived() {
        this.echo('login and redirect to /discover successful!', "GREEN_BAR");
        this.echo('page url after redirect: ' + this.evaluate(function() {
            return document.location.href;
        }), "GREEN_BAR");

        test.assertUrlMatch(/discover/, "Redirected to discover page post-login");
    });

    casper.run(function() {
        test.done();
    });
});

/*
continue on with e2eTests.js
*/

