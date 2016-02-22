// d3ctrl.js Controller for creating the result visualization

'use strict';

(angular.module('d3', [])
  .factory('d3Service', ['$document', '$q', '$rootScope',
    function($document, $q, $rootScope) {
      var d = $q.defer();
      function onScriptLoad() {
        // Load client in the browser
        $rootScope.$apply(function() { d.resolve(window.d3); });
      }
      // Create a script tag with d3 as the source
      // and call our onScriptLoad callback when it
      // has been loaded
      var scriptTag = $document[0].createElement('script');
      scriptTag.type = 'text/javascript'; 
      scriptTag.async = true;
      scriptTag.src = 'js/d3.v3.min.js';
      scriptTag.onreadystatechange = function () {
        if (this.readyState == 'complete') onScriptLoad();
      }
      scriptTag.onload = onScriptLoad;
 
      var s = $document[0].getElementsByTagName('body')[0];
      s.appendChild(scriptTag);
      return {
        d3: function() { return d.promise; }
      };
}])
);


(angular.module('d3.directives', ['d3','tummytrials.pasttrial1ctrl', 'tummytrials.visdata'])
  .directive('resultVis', ['d3Service', function(d3Service, $window, Visdata) {

    return {
      restrict: 'EA',
      scope: { 
        // data: '=resultData',
        // label: '@',
        // onClick: '&'
      },
      link: function( scope, element, attrs) {
        d3Service.d3().then(function(d3) {

          // Set dimensions of the canvas
          var margin = {top: 20, right: 20, bottom: 30, left: 40},
              width = 350 - margin.left - margin.right,
              height = 300 - margin.top - margin.bottom;

          // Hard coding values of colors
          var color = d3.scale.ordinal().range(['#74c476', ' #6baed6']); // green and blue respectively

          // Set the ranges
          var x = d3.scale.linear()
              .range([0, width]);

          var y = d3.scale.linear()
              .range([height, 0]);

          // Define the axes
          var xAxis = d3.svg.axis()
              .scale(x)
              .orient("bottom")
              .tickPadding(15);

          var yAxis = d3.svg.axis()
              .scale(y)
              .orient("left")
              .ticks(7)
              .tickPadding(15);

          // Add the svg canvas
          var svg = d3.select(element[0])
            .append('svg')
            .style('width', '100%')
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          var data = [
                      {
                        "condition": "a",
                        "severity": 4,
                        "date": 14
                      },
                      {
                        "condition": "a",
                        "severity": -2,
                        "date": 15
                      },
                      {
                        "condition": "b",
                        "severity": -2,
                        "date": 16
                      },
                      {
                        "condition": "b",
                        "severity": 2,
                        "date": 17
                      },
                      {
                        "condition": "a",
                        "severity": 5,
                        "date": 18
                      },
                      {
                        "condition": "a",
                        "severity": 1,
                        "date": 19
                      },
                      {
                        "condition": "b",
                        "severity": 4,
                        "date": 20
                      },
                      {
                        "condition": "b",
                        "severity": 4,
                        "date": 21
                      },
                      {
                        "condition": "a",
                        "severity": 4,
                        "date": 22
                      },
                      {
                        "condition": "a",
                        "severity": 1,
                        "date": 23
                      },
                      {
                        "condition": "b",
                        "severity": 3,
                        "date": 24
                      },
                      {
                        "condition": "b",
                        "severity": 3,
                        "date": 25
                      },
                      {
                        "condition": "a",
                        "severity": 0,
                        "date": 26
                      },
                      {
                        "condition": "a",
                        "severity": -1,
                        "date": 27
                      },
                      {
                        "condition": "b",
                        "severity": 4,
                        "date": 28
                      },
                      {
                        "condition": "b",
                        "severity": 4,
                        "date": 29
                      },
                      {
                        "condition": "a",
                        "severity": 5,
                        "date": 30
                      },
                      {
                        "condition": "b",
                        "severity": 4,
                        "date": 31
                      }
                    ];

          console.log("Data : " + typeof(data));
          // Scale the range of the data
          x.domain(d3.extent(data, function(d) { 
            //console.log(d.date);
            return parseInt(d.date); }));
          //x.domain(data.map(function(d) { return d.date; }));
          y.domain([-2, 6]);

          // remove all previous items before render
          svg.selectAll('*').remove();

          // Add the X Axis
          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis);

          // Add the Y Axis
          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis)
            .append("text")
              .attr("transform", "rotate(-90)")
              .attr("y", 7)
              .attr("dy", ".71em")
              .style("text-anchor", "end")
              .text("Severity");

          // Add the squares
          svg.selectAll(".point")
              .data(data)
            .enter().append("path")
                .attr("class", "point")
                .attr("d", d3.svg.symbol().type("square").size([100]))
                .attr("transform", function(d) { 
                    return "translate(" + x(d.date) + "," + y(d.severity) + ")"; 
                })
                .style("fill", function(d){return color(d.condition)});
                // .on('mouseover', tip.show)
                // .on('mouseout', tip.hide);


        });
      }}
}])
);


/* Old stuff
          // console.log("data is: " + data);
          console.log("\nscope data is: " + scope.data);
          var margin = parseInt(attrs.margin) || 20,
          barHeight = parseInt(attrs.barHeight) || 20,
          barPadding = parseInt(attrs.barPadding) || 5;
          // d3 is the raw d3 object
          // We can find the width of the parent element with a bit of 
          // DOM-dancing with the following: d3.select(ele[0]).node().offsetWidth.
          var svg = d3.select(element[0])
            .append('svg')
            .style('width', '100%');
 
          // Browser onresize event
          // window.onresize = function() {
          //   scope.$apply();
          // };
          
          // Watch for resize event
          // scope.$watch(function() {
          //   return angular.element($window)[0].innerWidth;
          // }, function() {
          //   scope.render(scope.data);
          // });
 
        // scope.render = function(data) {
          // our custom d3 code

          // remove all previous items before render
        svg.selectAll('*').remove();
     
        // If we don't pass any data, return out of the element
        // if (!data) return;


        // setup variables
        var width = d3.select(element[0]).node().offsetWidth - margin,
            // calculate the height
            height = scope.data.length * (barHeight + barPadding),
            // Use the category20() scale function for multicolor support
            color = d3.scale.category20(),
            // our xScale
            xScale = d3.scale.linear()
              .domain([0, d3.max(scope.data, function(d) {
                return d.score;
              })])
              .range([0, width]);
     
        // set the height based on the calculations above
        svg.attr('height', height);

        //create the rectangles for the bar chart
        svg.selectAll('rect')
          .data(scope.data).enter()
            .append('rect')
            .on("click", function(d, i){return scope.onClick({item: d});})
            .attr('height', barHeight)
            .attr('width', 140)
            .attr('x', Math.round(margin/2))
            .attr('y', function(d,i) {
              return i * (barHeight + barPadding);
            })
            .attr('fill', function(d) { return color(d.score); })
            .transition()
              .duration(1000)
              .attr('width', function(d) {
                return xScale(d.score);
              });

          // }


*/ //End of old stuff