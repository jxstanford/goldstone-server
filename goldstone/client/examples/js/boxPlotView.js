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

// view is linked to collection when instantiated in goldstone_discover.html

var BoxPlotView = Backbone.View.extend({

    defaults: {},

    initialize: function(options) {

        this.options = options || {};
        this.defaults = _.clone(this.defaults); 
        this.el = options.el;

        this.defaults.w = options.w;
        this.defaults.data = options.data;
        this.defaults.chartHeader = options.chartHeader || null;

        var ns = this.defaults;
        var self = this;

        // this.render();
        this.initSvg();
        this.collection.on('sync', this.update, this);

    },

    initSvg: function() {
        var self = this;
        var ns = this.defaults;

    },

    update: function() {
        var self = this;
        var ns = this.defaults;
        var csv = this.collection.toJSON();

        d3.box = function() {
            var width = 1,
                height = 1,
                duration = 0,
                domain = null,
                value = Number,
                whiskers = boxWhiskers,
                quartiles = boxQuartiles,
                tickFormat = null;

            // For each small multiple…
            function box(g) {
                g.each(function(d, i) {
                    d = d.map(value).sort(d3.ascending);
                    var g = d3.select(this),
                        n = d.length,
                        min = d[0],
                        max = d[n - 1];

                    // Compute quartiles. Must return exactly 3 elements.
                    var quartileData = d.quartiles = quartiles(d);

                    // Compute whiskers. Must return exactly 2 elements, or null.
                    var whiskerIndices = whiskers && whiskers.call(this, d, i),
                        whiskerData = whiskerIndices && whiskerIndices.map(function(i) {
                            return d[i];
                        });

                    // Compute outliers. If no whiskers are specified, all data are "outliers".
                    // We compute the outliers as indices, so that we can join across transitions!
                    var outlierIndices = whiskerIndices ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n)) : d3.range(n);

                    // Compute the new x-scale.
                    var x1 = d3.scale.linear()
                        .domain(domain && domain.call(this, d, i) || [min, max])
                        .range([height, 0]);

                    // Retrieve the old x-scale, if this is an update.
                    var x0 = this.__chart__ || d3.scale.linear()
                        .domain([0, Infinity])
                        .range(x1.range());

                    // Stash the new scale.
                    this.__chart__ = x1;

                    // Note: the box, median, and box tick elements are fixed in number,
                    // so we only have to handle enter and update. In contrast, the outliers
                    // and other elements are variable, so we need to exit them! Variable
                    // elements also fade in and out.

                    // Update center line: the vertical line spanning the whiskers.
                    var center = g.selectAll("line.center")
                        .data(whiskerData ? [whiskerData] : []);

                    center.enter().insert("line", "rect")
                        .attr("class", "center")
                        .attr("x1", width / 2)
                        .attr("y1", function(d) {
                            return x0(d[0]);
                        })
                        .attr("x2", width / 2)
                        .attr("y2", function(d) {
                            return x0(d[1]);
                        })
                        .style("opacity", 1e-6)
                        .transition()
                        .duration(duration)
                        .style("opacity", 1)
                        .attr("y1", function(d) {
                            return x1(d[0]);
                        })
                        .attr("y2", function(d) {
                            return x1(d[1]);
                        });

                    center.transition()
                        .duration(duration)
                        .style("opacity", 1)
                        .attr("y1", function(d) {
                            return x1(d[0]);
                        })
                        .attr("y2", function(d) {
                            return x1(d[1]);
                        });

                    center.exit().transition()
                        .duration(duration)
                        .style("opacity", 1e-6)
                        .attr("y1", function(d) {
                            return x1(d[0]);
                        })
                        .attr("y2", function(d) {
                            return x1(d[1]);
                        })
                        .remove();

                    // Update innerquartile box.
                    var box = g.selectAll("rect.box")
                        .data([quartileData]);

                    box.enter().append("rect")
                        .attr("class", "box")
                        .attr("x", 0)
                        .attr("y", function(d) {
                            return x0(d[2]);
                        })
                        .attr("width", width)
                        .attr("height", function(d) {
                            return x0(d[0]) - x0(d[2]);
                        })
                        .transition()
                        .duration(duration)
                        .attr("y", function(d) {
                            return x1(d[2]);
                        })
                        .attr("height", function(d) {
                            return x1(d[0]) - x1(d[2]);
                        });

                    box.transition()
                        .duration(duration)
                        .attr("y", function(d) {
                            return x1(d[2]);
                        })
                        .attr("height", function(d) {
                            return x1(d[0]) - x1(d[2]);
                        });

                    // Update median line.
                    var medianLine = g.selectAll("line.median")
                        .data([quartileData[1]]);

                    medianLine.enter().append("line")
                        .attr("class", "median")
                        .attr("x1", 0)
                        .attr("y1", x0)
                        .attr("x2", width)
                        .attr("y2", x0)
                        .transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1);

                    medianLine.transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1);

                    // Update whiskers.
                    var whisker = g.selectAll("line.whisker")
                        .data(whiskerData || []);

                    whisker.enter().insert("line", "circle, text")
                        .attr("class", "whisker")
                        .attr("x1", 0)
                        .attr("y1", x0)
                        .attr("x2", width)
                        .attr("y2", x0)
                        .style("opacity", 1e-6)
                        .transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1)
                        .style("opacity", 1);

                    whisker.transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1)
                        .style("opacity", 1);

                    whisker.exit().transition()
                        .duration(duration)
                        .attr("y1", x1)
                        .attr("y2", x1)
                        .style("opacity", 1e-6)
                        .remove();

                    // Update outliers.
                    var outlier = g.selectAll("circle.outlier")
                        .data(outlierIndices, Number);

                    outlier.enter().insert("circle", "text")
                        .attr("class", "outlier")
                        .attr("r", 5)
                        .attr("cx", width / 2)
                        .attr("cy", function(i) {
                            return x0(d[i]);
                        })
                        .style("opacity", 1e-6)
                        .transition()
                        .duration(duration)
                        .attr("cy", function(i) {
                            return x1(d[i]);
                        })
                        .style("opacity", 1);

                    outlier.transition()
                        .duration(duration)
                        .attr("cy", function(i) {
                            return x1(d[i]);
                        })
                        .style("opacity", 1);

                    outlier.exit().transition()
                        .duration(duration)
                        .attr("cy", function(i) {
                            return x1(d[i]);
                        })
                        .style("opacity", 1e-6)
                        .remove();

                    // Compute the tick format.
                    var format = tickFormat || x1.tickFormat(8);

                    // Update box ticks.
                    var boxTick = g.selectAll("text.box")
                        .data(quartileData);

                    boxTick.enter().append("text")
                        .attr("class", "box")
                        .attr("dy", ".3em")
                        .attr("dx", function(d, i) {
                            return i & 1 ? 6 : -6;
                        })
                        .attr("x", function(d, i) {
                            return i & 1 ? width : 0;
                        })
                        .attr("y", x0)
                        .attr("text-anchor", function(d, i) {
                            return i & 1 ? "start" : "end";
                        })
                        .text(format)
                        .transition()
                        .duration(duration)
                        .attr("y", x1);

                    boxTick.transition()
                        .duration(duration)
                        .text(format)
                        .attr("y", x1);

                    // Update whisker ticks. These are handled separately from the box
                    // ticks because they may or may not exist, and we want don't want
                    // to join box ticks pre-transition with whisker ticks post-.
                    var whiskerTick = g.selectAll("text.whisker")
                        .data(whiskerData || []);

                    whiskerTick.enter().append("text")
                        .attr("class", "whisker")
                        .attr("dy", ".3em")
                        .attr("dx", 6)
                        .attr("x", width)
                        .attr("y", x0)
                        .text(format)
                        .style("opacity", 1e-6)
                        .transition()
                        .duration(duration)
                        .attr("y", x1)
                        .style("opacity", 1);

                    whiskerTick.transition()
                        .duration(duration)
                        .text(format)
                        .attr("y", x1)
                        .style("opacity", 1);

                    whiskerTick.exit().transition()
                        .duration(duration)
                        .attr("y", x1)
                        .style("opacity", 1e-6)
                        .remove();
                });
                d3.timer.flush();
            }

            box.width = function(x) {
                if (!arguments.length) return width;
                width = x;
                return box;
            };

            box.height = function(x) {
                if (!arguments.length) return height;
                height = x;
                return box;
            };

            box.tickFormat = function(x) {
                if (!arguments.length) return tickFormat;
                tickFormat = x;
                return box;
            };

            box.duration = function(x) {
                if (!arguments.length) return duration;
                duration = x;
                return box;
            };

            box.domain = function(x) {
                if (!arguments.length) return domain;
                domain = (x === null || x === undefined) ? x : d3.functor(x);
                return box;
            };

            box.value = function(x) {
                if (!arguments.length) return value;
                value = x;
                return box;
            };

            box.whiskers = function(x) {
                if (!arguments.length) return whiskers;
                whiskers = x;
                return box;
            };

            box.quartiles = function(x) {
                if (!arguments.length) return quartiles;
                quartiles = x;
                return box;
            };

            return box;
        };

        function boxWhiskers(d) {
            return [0, d.length - 1];
        }

        function boxQuartiles(d) {
            return [
                d3.quantile(d, 0.25),
                d3.quantile(d, 0.5),
                d3.quantile(d, 0.75)
            ];
        }

        var margin = {
                top: 10,
                right: 50,
                bottom: 20,
                left: 50
            },
            width = 120 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        var min = Infinity,
            max = -Infinity;

        var chart = d3.box()
            .whiskers(iqr(1.5))
            .width(width)
            .height(height);


        var data = [];

        csv.forEach(function(x) {
            var e = Math.floor(x.expt - 1),
                r = Math.floor(x.run - 1),
                s = Math.floor(x.speed),
                d = data[e];
            if (!d) d = data[e] = [s];
            else d.push(s);
            if (s > max) max = s;
            if (s < min) min = s;
        });

        chart.domain([min, max]);

        var svg = d3.select(this.el).selectAll("svg")
            .data(data)
            .enter().append("svg")
            .attr("class", "box")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(chart);

        setInterval(function() {
            svg.datum(randomize).call(chart.duration(1000));
        }, 2000);

        function randomize(d) {
            if (!d.randomizer) d.randomizer = randomizer(d);
            return d.map(d.randomizer);
        }

        function randomizer(d) {
            var k = d3.max(d) * 0.02;
            return function(d) {
                return Math.max(min, Math.min(max, d + k * (Math.random() - 0.5)));
            };
        }

        // Returns a function to compute the interquartile range.
        function iqr(k) {
            return function(d, i) {
                var q1 = d.quartiles[0],
                    q3 = d.quartiles[2],
                    iqr = (q3 - q1) * k,
                    j = d.length;
                i = -1;
                while (d[++i] < q1 - iqr);
                while (d[--j] > q3 + iqr);
                return [i, j];
            };
        }

    },

    render: function() {

        var ns = this.defaults;

        if (ns.chartHeader !== null) {
            new ChartHeaderView({
                el: ns.chartHeader[0],
                chartTitle: ns.chartHeader[1],
                infoText: ns.chartHeader[2],
                columns: 12
            });
        }

        this.$el.append(this.template());
        return this;
    },

    template: _.template('' +
        '<button style="position: absolute; right: 100px; top:60px;">Update</button>'
    )
});
