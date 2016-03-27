angular.module('InstanceHistory', ['ngMaterial','ngAria'])
    .controller('transitionHistory', function($scope) {
        $scope.title1 = 'Button';
        $scope.title4 = 'Warn';
        $scope.isDisabled = false;
        $scope.googleUrl = 'http://google.com';
        console.log('error',$scope);
        if($scope.transition) {
            $scope.transition();
        }
    })
    .directive('historyChart', ['InstanceService',
        function(InstanceService) {
            return {
                scope: {
                    rangeStart: '@',
                    rangeEnd: '@'
                },
                link: function(scope, element) {
                    scope.target = element;
                },
                controller: ['$scope', '$timeout',
                    function($scope, $timeout) {
                        console.log('error',$scope);

                        var start = new Date(2014, 7, 2), //new Date($scope.rangeStart),
                            end = new Date(2015, 7, 2); //new Date($scope.rangeEnd);

                        var formattedDate = [start.getFullYear(), start.getMonth(), start.getDate()].join('-');
                        var formattedEndDate = [end.getFullYear(), end.getMonth(), end.getDate()].join('-');


                        $scope.getData = function() {};

                        $scope.getChart = function(result, resultEnd) {
                            var stack = d3.layout.stack()
                                .offset('wiggle')
                                .order('reverse');
                            console.log('error', result.data.instances);
                            console.log('error', resultEnd.data.instances);

                            var vals = Object.getOwnPropertyNames(result.data.instances).map(function(x) {
                                return result.data.instances[x].map(
                                    function(d, i) {
                                        return {
                                            x: new Date(d.x).getTime(),
                                            y: d.y
                                        }
                                    });
                            });
                            vals = vals.map(function(d) {
                                localMin = d3.min(d, function(item) {
                                    return item.y
                                })
                                return d.map(
                                    function(item) {
                                        item.y = item.y - localMin;
                                        return item
                                    })
                            })
                            console.log('error', vals);
                            $scope.layers = stack(vals);
                            console.log('error', $scope.layers)


                            var endVals = Object.getOwnPropertyNames(resultEnd.data.instances).map(function(x) {
                                return resultEnd.data.instances[x].map(
                                    function(d, i) {
                                        return {
                                            x: new Date(d.x).getTime(),
                                            y: d.y
                                        }
                                    });
                            });
                            endVals = endVals.map(function(d) {
                                localMin = d3.min(d, function(item) {
                                    return item.y
                                })
                                return d.map(
                                    function(item) {
                                        item.y = item.y - localMin;
                                        return item
                                    })
                            })
                            console.log('error', endVals);
                            $scope.layersEnd = stack(endVals);
                            console.log('error', $scope.layersEnd)

                            var width = 1200,
                                height = 600;

                            var startTime = d3.min(vals.map(function(d) {
                                    return d3.min(d, function(item) {
                                        return item.x
                                    })
                                })),
                                endTime = d3.max(vals.map(function(d) {
                                    return d3.max(d, function(item) {
                                        return item.x
                                    })
                                }));

                            // var xScale = d3.time.scale()
                            var xScale = d3.scale.linear()
                                .domain([startTime, endTime])
                                .range([0, width]);

                            var maxCores = d3.max(vals.map(function(d) {
                                return d3.max(d, function(item) {
                                    return item.y0
                                })
                            }))
                            var minCores = d3.min(vals.map(function(d) {
                                return d3.min(d, function(item) {
                                    return item.y0
                                })
                            }))
                            var yScale = d3.scale.linear()
                                .domain([minCores, maxCores])
                                .range([height, 0]);

                            var color = d3.scale.linear()
                                // .range(["#fff", "#f90"]);
                                // .range(["#08f", "#f90"]);
                                .range(["#08f", "#fff"]);

                            var svg = d3.select($scope.target[0]);

                            $scope.area = d3.svg.area()
                                .x(function(d) {
                                    return xScale(d.x);
                                })
                                .y0(function(d) {
                                    return yScale(d.y0);
                                })
                                .y1(function(d) {
                                    return yScale(d.y0 + d.y);
                                });

                            svg.selectAll('path')
                                .data($scope.layers)
                                .enter().append('path')
                                .attr('d', $scope.area)
                                .style("fill", function() {
                                    return color(Math.random());
                                });
                        };

                        $scope.$parent.transition = function() {
                            console.log('warning','transitioning');
                            d3.selectAll("path")
                                .data(function() {

                                    var d = $scope.layersEnd;
                                    $scope.layersEnd = $scope.layers;
                                    return $scope.layers = d;
                                })
                                .transition()
                                .duration(2500)
                                .attr("d", $scope.area);
                            console.log('warning','transitioning done');
                        }

                        $timeout(function() {
                            InstanceService.getInstances(formattedDate).then(function(result) {
                                InstanceService.getInstances(formattedEndDate).then(function(resultEnd) {
                                    $scope.getChart(result, resultEnd);
                                }, function(response) {
                                    console.log('error', response);
                                });
                            }, function(response) {
                                console.log('error', response);
                            });
                        });
                    }
                ]
            };
        }
    ])
    .factory('InstanceService', ['$http', '$interpolate',
        function($http, $interpolate) {
            var urlFunc = $interpolate('/data/{{ date }}');

            return {
                getInstances: function(date) {
                    return $http({
                        method: 'GET',
                        url: urlFunc({
                            date: date
                        })
                    });
                }
            };
        }
    ]);