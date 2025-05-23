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

/*global sinon, todo, chai, describe, it, calledOnce*/
//integration tests

describe('apiPerfView.js spec', function() {
    beforeEach(function() {

        $('body').html('<div class="testContainer"></div>' +
            '<div style="width:10%;" class="col-xl-1 pull-right">&nbsp;' +
            '</div>' +
            '<div class="col-xl-2 pull-right">' +
            '<form class="global-refresh-selector" role="form">' +
            '<div class="form-group">' +
            '<div class="col-xl-1">' +
            '<div class="input-group">' +
            '<select class="form-control" id="global-refresh-range">' +
            '<option value="15">refresh 15s</option>' +
            '<option value="30" selected>refresh 30s</option>' +
            '<option value="60">refresh 1m</option>' +
            '<option value="300">refresh 5m</option>' +
            '<option value="-1">refresh off</option>' +
            '</select>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</form>' +
            '</div>' +
            '<div class="col-xl-1 pull-right">' +
            '<form class="global-lookback-selector" role="form">' +
            '<div class="form-group">' +
            '<div class="col-xl-1">' +
            '<div class="input-group">' +
            '<select class="form-control" id="global-lookback-range">' +
            '<option value="15">lookback 15m</option>' +
            '<option value="60" selected>lookback 1h</option>' +
            '<option value="360">lookback 6h</option>' +
            '<option value="1440">lookback 1d</option>' +
            '</select>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</form>' +
            '</div>');

        // to answer GET requests
        this.server = sinon.fakeServer.create();
        this.server.respondWith("GET", "/something/fancy", [200, {
            "Content-Type": "application/json"
        }, '[]']);

        // confirm that dom is clear of view elements before each test:
        expect($('svg').length).to.equal(0);
        expect($('#spinner').length).to.equal(0);

        this.testCollection = new StackedBarChartCollection({
            urlPrefix: 'nova'
        });

        blueSpinnerGif = "goldstone/static/images/ajax-loader-solinea-blue.gif";

        this.testView = new StackedBarChartView({
            chartTitle: "Tester API Performance",
            collection: this.testCollection,
            height: 300,
            infoCustom: 'novaSpawns',
            el: 'body',
            width: $('body').width(),
            yAxisLabel: 'yAxisTest'
        });
    });
    afterEach(function() {
        $('body').html('');
        this.server.restore();
    });
    describe('collection is constructed', function() {
        it('should exist', function() {
            var dataTest = JSON.stringify('hello');
            assert.isDefined(this.testCollection, 'this.testCollection has been defined');
            expect(this.testCollection.parse).to.be.a('function');
            this.testCollection.initialize({
                urlPrefix: 'glance'
            });
            expect(this.testCollection.length).to.equal(1);
            this.testCollection.add({
                test1: 'test1'
            });
            expect(this.testCollection.length).to.equal(2);
            this.testCollection.parse(dataTest);
        });
    });

    describe('view is constructed', function() {
        it('should exist', function() {
            assert.isDefined(this.testView, 'this.testView has been defined');
            expect(this.testView).to.be.an('object');
            expect(this.testView.el).to.equal('body');
        });
        it('info button popover responds to click event', function() {
            expect($('div.popover').length).to.equal(0);
            $(this.testView.el).find('#info-button').click();
            expect($('div.popover').length).to.equal(1);
        });
        it('view update appends svg and border elements', function() {
            expect(this.testView.update).to.be.a('function');
            this.testView.update();
            expect($('svg').length).to.equal(1);
            expect($('g.legend-items').find('text').text()).to.equal('FailSuccess');
            expect($('.panel-title').text().trim()).to.equal('Tester API Performance');
            expect($('svg').text()).to.not.include('Response was empty');
        });
        it('can handle a null server payload and append appropriate response', function() {
            this.update_spy = sinon.spy(this.testView, "update");
            expect($('#noDataReturned').text()).to.equal('');
            this.testCollection.reset();
            this.testView.update();
            expect($('.popup-message').text()).to.equal('No Data Returned');
            this.testCollection.add({
                url: '/blah'
            });
            this.testView.update();
            expect($('#noDataReturned').text()).to.equal('');
            expect(this.update_spy.callCount).to.equal(2);
            this.update_spy.restore();
        });
        it('can utilize the dataErrorMessage machinery to append a variety of errors', function() {
            this.dataErrorMessage_spy = sinon.spy(this.testView, "dataErrorMessage");
            expect($('#noDataReturned').text()).to.equal('');
            this.testView.dataErrorMessage(null, {
                status: '999',
                responseText: 'naughty - coal for you!'
            });
            expect($('.popup-message').text()).to.equal('999 error: naughty - coal for you!.');
            this.testView.dataErrorMessage(null, {
                status: '123',
                responseText: 'nice - bourbon for you!'
            });
            expect($('.popup-message').text()).to.equal('123 error: nice - bourbon for you!.');
            this.testView.dataErrorMessage('butterfly - spread your wings again');
            expect($('.popup-message').text()).to.equal('butterfly - spread your wings again');
            this.testCollection.add({
                url: '/blah'
            });
            this.testView.update();
            expect($('#noDataReturned').text()).to.equal('');
            expect(this.dataErrorMessage_spy.callCount).to.equal(3);
            this.dataErrorMessage_spy.restore();
        });
        it('listens for changes to the global lookback/refresh selectors', function() {
            this.urlGenerator_spy = sinon.spy(this.testCollection, "urlGenerator");
            this.testView.trigger('lookbackSelectorChanged');
            expect(this.urlGenerator_spy.callCount).to.equal(1);
            this.urlGenerator_spy.restore();
        });
        it('properly prepares popovers', function() {
            var test1 = this.testView.computeHiddenBarText({
                eventTime: '1425071850093',
                Used: '6',
                Physical: '16',
                Virtual: '256',
                total: 256,
                stackedBarPrep: [1, 2, 3]
            });
            var test2 = this.testView.computeHiddenBarText({
                eventTime: '1425071850093',
                Used: '16',
                Physical: '26',
                Virtual: '356',
                total: 456,
                stackedBarPrep: [1, 2, 3, 4]
            });
            expect(test1).to.equal('2015-02-27T13:17:30-08:00<br>Virtual: 256<br>Physical: 16<br>Used: 6<br>');
            expect(test2).to.equal('2015-02-27T13:17:30-08:00<br>Virtual: 356<br>Physical: 26<br>Used: 16<br>');
            // can handle dates but various kinds of missing data
            var test3 = this.testView.computeHiddenBarText({
                eventTime: '1425071850093',
                Used: undefined,
                Physical: undefined,
                Virtual: undefined,
                total: undefined,
                stackedBarPrep: [1, 2, 3]
            });
            expect(test3).to.equal('2015-02-27T13:17:30-08:00<br>Virtual: undefined<br>Physical: undefined<br>Used: undefined<br>');
            var test4 = this.testView.computeHiddenBarText({
                eventTime: '1425071850093',
                Used: 0,
                Physical: 0,
                Virtual: 0,
                total: 0,
                stackedBarPrep: [1, 2, 3]
            });
            expect(test4).to.equal('2015-02-27T13:17:30-08:00<br>Virtual: 0<br>Physical: 0<br>Used: 0<br>');
            var test5 = this.testView.computeHiddenBarText({
                eventTime: '1425071850093'
            });
            expect(test5).to.equal('2015-02-27T13:17:30-08:00<br>');
            var test6 = this.testView.computeHiddenBarText({
                eventTime: '1425071850093',
                Used: 'bicycles',
                Physical: 'discomfort',
                Virtual: 'indestructable'
            });
            expect(test6).to.equal('2015-02-27T13:17:30-08:00<br>Virtual: indestructable<br>Physical: discomfort<br>Used: bicycles<br>');
        });
    });
});
