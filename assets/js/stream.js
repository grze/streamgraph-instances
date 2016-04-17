angular.module('InstanceHistory', ['angularMoment'])
    .directive('historyChart', ['InstanceService',
        function (InstanceService) {
            return {
                scope: {
                    rangeStart: '@',
                    rangeEnd: '@'
                },
                link: function (scope, element) {
                    scope.target = element;
                },
                controller: ['$scope', '$timeout', '$interval',
                    function ($scope, $timeout, $interval) {
                        console.log('error', $scope);

                        $scope.prepareValues = function (layervalues) {
                            $scope.cloudCounts = $scope.cloudNames.map(function (x) {
                                return layervalues[x].reduce(function (p, c) {
                                    return p + c.y;
                                }, 0);
                            });

                            var vals = Object.getOwnPropertyNames(layervalues).map(function (x) {
                                return layervalues[x].map(
                                    function (d, i) {
                                        return {
                                            x: new Date(d.x).getTime(),
                                            y: d.y
                                        }
                                    });
                            });
                            vals = vals.map(function (d) {
                                localXMin = d3.min(d, function (item) {
                                    return item.x
                                });
                                return d.map(
                                    function (item) {
                                        item.x = item.x - localXMin;
                                        return item
                                    });
                            });
                            vals = vals.map(function (d) {
                                localYMin = d3.min(d, function (item) {
                                    return item.y
                                })
                                return d.map(
                                    function (item) {
                                        item.y = item.y - localYMin;
                                        return item
                                    })
                            });
                            $scope.vals = vals;
                            return $scope.vals;
                        };

                        $scope.updateArea = function (svg, vals) {
                            // size of the canvas
                            var width = 800,
                                height = 500;
                            // min and max for x-axis domain
                            var startTime = d3.min(vals.map(function (d) {
                                    return d3.min(d, function (item) {
                                        return item.x
                                    })
                                })),
                                endTime = d3.max(vals.map(function (d) {
                                    return d3.max(d, function (item) {
                                        return item.x
                                    })
                                }));
                            // setup x-axis
                            var xScale = d3.scale.linear()
                                .domain([startTime, endTime])
                                .range([0, width]);

                            // min and max for y-axis
                            var maxCores = d3.max(vals.map(function (d) {
                                return d3.max(d, function (item) {
                                    return item.y0
                                })
                            }))
                            var minCores = d3.min(vals.map(function (d) {
                                return d3.min(d, function (item) {
                                    return item.y0
                                })
                            }))
                            // setup y-axis
                            var yScale = d3.scale.linear()
                                .domain([minCores, maxCores])
                                .range([height, 0]);
                            var area = d3.svg.area()
                                // .interpolate("basis")
                                .interpolate("bundle")
                                .x(function (d) {
                                    return xScale(d.x);
                                })
                                .y0(function (d) {
                                    return yScale(d.y0);
                                })
                                .y1(function (d) {
                                    return yScale(d.y0 + d.y);
                                });
                            $scope.area = area;
                            return area;
                        };

                        $scope.getColor = function () {
                            if (!$scope.color) {
                                // color range
                                var color = d3.scale.linear()
                                    .range(["#08f", "#fff"]);
                                $scope.color = color;
                            }
                            return $scope.color;
                        };

                        $scope.getStack = function (vals) {
                            if (!$scope.stack) {
                                $scope.stack = d3.layout.stack()
                                    .offset('wiggle')
                                    .order('default');
                                console.log('error', $scope.stack)
                            }
                            return $scope.stack;
                        };

                        $scope.initializeChart = function (result) {
                            //initialize stack layout
                            console.log('error', result.data.instances);
                            $scope.cloudNames = Object.getOwnPropertyNames(result.data.instances);
                            $scope.cloudCounts = $scope.cloudNames.map(function (x) {
                                return result.data.instances[x].reduce(function (p, c) {
                                        return p + c.y;
                                    }, 0);
                            });
                            var vals = $scope.prepareValues(result.data.instances);
                            var stack = $scope.getStack(vals);
                            if (!$scope.svg) {
                                $scope.svg = d3.select($scope.target[0])
                                    //responsive SVG needs these 2 attributes and no width and height attr
                                    .attr("preserveAspectRatio", "xMinYMin meet")
                                    .attr("viewBox", "0 0 800 600")
                                    //class to make it responsive
                                    .classed("svg-content-responsive", true);
                                var svg = $scope.svg;
                                var layers = stack(vals);
                                var area = $scope.updateArea(svg, vals);
                                var mousemove = function () {
                                    var x0 = x.invert(d3.mouse(this)[0]),
                                        i = bisectDate(data, x0, 1),
                                        d0 = data[i - 1],
                                        d1 = data[i],
                                        d = x0 - d0.date > d1.date - x0 ? d1 : d0;
                                    focus.attr("transform", "translate(" + x(d.date) + "," + y(d.close) + ")");
                                    focus.select("text").text(formatCurrency(d.close));
                                };
                                var focus = d3.select($scope.target[0])
                                    .append("g")
                                    .attr("class", "focus")
                                    .style("display", "none");

                                focus.append("circle")
                                    .attr("r", 4.5);

                                focus.append("text")
                                    .attr("x", 9)
                                    .attr("dy", ".35em");

                                var mouseOverText = d3.select($scope.target[0])
                                    .append("text")
                                    .attr("class", "tooltip")
                                    .attr("x", function (d) {
                                        return 20;
                                    })
                                    .attr("y", function (d) {
                                        return 40;
                                    })
                                    .text(function (d) {
                                        return "";
                                    })
                                    .attr("font-family", "courier")
                                    .attr("font-size", "14px")
                                    .attr("fill", "white");

                                var paths = $scope.svg.selectAll('path')
                                    .data(layers)
                                    .enter().append('path')
                                    .attr('d', area)
                                    .attr("stroke", "black")
                                    .attr("stroke-width", "1px")
                                    // set opacity up right now so on transition it'll start at 1.0:
                                    .attr("opacity", 1)
                                    .on("mouseover", function (d, i) {
                                        mouseOverText
                                            .transition()
                                            .duration(10)
                                            .attr("opacity", 1)
                                            .text($scope.cloudNames[i] + ": " + $scope.cloudCounts[i] + " instances");
                                        paths
                                            .transition()
                                            .duration(10)
                                            .attr("opacity", function (d, j) {
                                                return j != i ? 0.2 : 1;
                                            });
                                    })
                                    .on("mouseout", function (d, i) {
                                        mouseOverText
                                            .transition()
                                            .duration(10)
                                            .attr("opacity", 0);
                                        paths
                                            .transition()
                                            .duration(10)
                                            .attr("opacity", 1);
                                    })
                                    .style("fill", function () {
                                        var color = $scope.getColor();
                                        return color(Math.random());
                                    });
                                var text = d3.select($scope.target[0])
                                    .append("text")
                                    .attr("class", "timer")
                                    .attr("x", function (d) {
                                        return 20;
                                    })
                                    .attr("y", function (d) {
                                        return 20;
                                    })
                                    .text(function (d) {
                                        return "Instances run on " + $scope.date.format("YYYY-MM-DD");
                                    })
                                    .attr("font-family", "courier")
                                    .attr("font-size", "20px")
                                    .attr("fill", "white");

                            }
                            return $scope.svg;
                        };

                        $scope.updateLoop = function () {
                            if ($scope.date) {
                                console.log('error', 'begin update after rendering date: ' + $scope.date.format("YYYY-MM-DD"));
                                var startDate = $scope.date.format("YYYY-MM-DD");
                                var endDate = moment(startDate, "YYYY-MM-DD").add(1, "days").format("YYYY-MM-DD");
                                $scope.date.add(1, 'days');
                                console.log('error', 'fetching next date: ' + startDate + '/' + endDate);
                                InstanceService.getInstances(startDate, endDate)
                                    .then(
                                        function (result) {
                                            console.log('error', 'render transition to ' + $scope.date.format("YYYY-MM-DD"))
                                            var vals = $scope.prepareValues(result.data.instances);
                                            d3.selectAll("path")
                                                .data(function () {
                                                    return $scope.stack(vals);
                                                })
                                                .transition()
                                                .duration(1500)
                                                .ease("elastic")
                                                .attr("d", $scope.updateArea($scope.svg, vals));
                                            d3.selectAll("text.timer")
                                                .text(function (d) {
                                                    return "Instances run on " + startDate;
                                                });

                                        },
                                        function (response) {
                                            console.log('error', response);
                                        }
                                    );
                            }
                        };
                        if (!$scope.svg) {
                            $timeout(function () {
                                if (!$scope.date) {
                                    $scope.date = moment(new Date(2014, 7, 30));
                                    var startDate = $scope.date.format("YYYY-MM-DD");
                                    $scope.date.add(1, 'days');
                                    var endDate = $scope.date.format("YYYY-MM-DD");
                                    console.log('error', 'initializing date: ' + startDate + '/' + endDate);
                                    InstanceService.getInstances(startDate, endDate)
                                        .then(
                                            function (result) {
                                                console.log('error', 'got results for date: ' + $scope.date.format("YYYY-MM-DD"))
                                                $scope.initializeChart(result);
                                            },
                                            function (response) {
                                                console.log('error', response);
                                            }
                                        );
                                }
                            });
                            // # d3.timer(function[, delay[, time]])
                            $interval(function () {
                                $scope.updateLoop();
                            }, 2000, 0, true);
                        }
                    }
                ]
            };
        }
    ])
    .factory('InstanceService', ['$http', '$interpolate',
        function ($http, $interpolate) {
            var urlFunc = $interpolate('/data/{{ date }}/{{ endDate }}');

            return {
                getInstances: function (date, endDate) {
                    return $http({
                        method: 'GET',
                        url: urlFunc({
                            date: date,
                            endDate: endDate
                        })
                    });
                }
            };
        }
    ]);
