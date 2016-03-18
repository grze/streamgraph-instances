angular.module('EucaInstanceHistory', [])
.directive('historyChart', ['InstanceService', function (InstanceService) {
    return {
        scope: {
            rangeStart: '@',
            rangeEnd: '@'
        },
        link: function (scope, element) {
            scope.target = element;
        },
        controller: ['$scope', '$timeout', function ($scope, $timeout) {
            var start = new Date(2014, 2, 1),//new Date($scope.rangeStart),
                end = new Date($scope.rangeEnd);

            var formattedDate = [start.getFullYear(), start.getMonth() + 1, start.getDate()].join('-');

            $scope.chart = d3.select($scope.target);
            $scope.stack = d3.layout.stack().offset('wiggle');

            $scope.getData = function () {
            };

            $scope.getChart = function (result) {
                var values = result.data.instances;
                var layer = $scope.stack(values);

                var xScale = d3.time.scale()
                    .domain([values[0].launchtime, values[values.length - 1].launchtime])
                    .range([0, 900]);

                var yScale = d3.scale.linear()
                    .domain([0, values.reduce(function (prev, curr) {
                        return prev + curr.corecount;
                    }, 0)])
                    .range([500, 0]);

                var color = d3.scale.linear()
                    .range(["#aad", "#556"]);

                var area = d3.svg.area()
                    .x(function (d) {
                        return xScale(d.x);
                    })
                    .y(function (d) {
                        return yScale(d.y);
                    })
                    .y0(function (d) {
                        return yScale(d.y + d.y0);
                    });

                $scope.chart.selectAll('path')
                    .data(layer)
                    .enter().append('path')
                    .attr('d', area)
                    .style("fill", function() {
                        return color(Math.random());
                    });
            };

            $timeout(function () {
                InstanceService.getInstances(formattedDate).then(function (result) {
                    $scope.getChart(result);
                }, function (response) {
                    console.log('error', response);
                });
            });
        }]
    };
}])
.factory('InstanceService', ['$http', '$interpolate', function ($http, $interpolate) {
    var urlFunc = $interpolate('/data/{{ date }}');

    return {
        getInstances: function (date) {
            return $http({
                method: 'GET',
                url: urlFunc({ date: date })
            });
        }
    };
}]);
