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


(angular.module('d3.directives', ['d3','tummytrials.pasttrial1ctrl'])
  .directive('resultVis', ['d3Service', function(d3Service, $window) {

    return {
      restrict: 'EA',
      replace: true,
      scope: { 
        data: '=resultData',
        label: '@',
        onClick: '&',
        control: '='
      },
      link: function( scope, element, attrs) {

        d3Service.d3().then(function(d3) {

          // Set dimensions of the canvas
          var margin = {top: 20, right: 20, bottom: 30, left: 70},
              width = 350 - margin.left - margin.right,
              height = 300 - margin.top - margin.bottom;

          // Hard coding values of colors
          // var color = d3.scale.ordinal().range(['#FFA70F', '#0F85FF']); // orange and blue respectively
          var color = d3.scale.ordinal()
                        .domain([0,1])
                        .range(['#FFA70F', '#0F85FF']);

          var circleR = 7;

          var yscale = d3.scale.linear()
                          .domain([0,8])
                          .range([height,0]);
          var xscale = d3.scale.ordinal()
                          .domain(scope.data.map(function(d) { return d.condition; }))
                          .rangeRoundBands([0,width]);

          // Define the axes
          var xAxis = d3.svg.axis()
              .scale(xscale)
              .orient("bottom")
              .tickFormat(function (d) {
                var mapper = {
                  0 : "Condition a",
                  1 : "Condition b"
                }
                return mapper[d]
              });

          var yAxis = d3.svg.axis()
              .scale(yscale)
              .orient("left")
              .ticks(9)
              .tickFormat(function (d) {
                var mapper = {
                  0 : "No report",
                  1 : "Missing data",
                  2 : "Not at all",
                  3 : "Slightly",        
                  4 : "Mildly",
                  5 : "Moderately",
                  6 : "Severely",
                  7 : "Very severely",
                  8 : "Extremely"
                }
                return mapper[d]
              });

          // Add the svg canvas
          var svg = d3.select(element[0])
            .append('svg')
            .style('width', '100%')
              .attr("height", height + margin.top + margin.bottom)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          // remove all previous items before render
          svg.selectAll('*').remove();

          // Add the X Axis
          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis)
            .append("text")
              .attr("y", -7)
              .attr("transform", "translate(" + width + " ,0)")
              .style("text-anchor", "end")
              // .style("padding-botton","10px")
              .text("Condition");

          // Add the Y Axis
          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis)
            .append("text")
              // .attr("x", x(scope.data[0].date))
              .attr("transform", "rotate(-90)")
              .attr("y", 7)
              .attr("dy", ".71em")
              .style("text-anchor", "end")
              .text("Severity");

          var groups = {};
          var circleR = 7;
          var discreteTo = (circleR * 2) / (yscale.range()[0] / yscale.domain()[1]);
          // console.log(discreteTo);
          scope.data.forEach (function(datum) {
              var g = Math.floor (datum.severity / discreteTo);
              var cat = datum.condition;
              var ref = cat+"-"+g;
              if (!groups[ref]) { groups[ref] = 0; }
              datum.groupIndex = groups[ref];
              datum.discy = yscale (g * discreteTo);  // discrete.
              groups[ref]++;
          });
          scope.data.forEach (function(datum) {
              var cat = datum.condition;
              var g = Math.floor (datum.severity / discreteTo);
              var ref = cat+"-"+g;
              datum.offset = datum.groupIndex - ((groups[ref] - 1) / 2);
          });

          svg.selectAll("circle").data(scope.data)
          .enter()
          .append("circle")
            .attr("cx", function(d) { return (margin.left - circleR/2 + 1)  + xscale(d.condition) + (d.offset * (circleR * 3)); }) // change the "3" to vary spacing between points. 2 is 0 spacing since diameter.
            .attr("r", circleR)
            .attr("cy", function(d) { return d.discy - circleR; })
            .style ("fill", function(d) { 
                if(d.severity > 1){
                  return color(d.condition); 
                } else if(d.severity == 0 || d.severity == 1){
                  return "grey";
                }

              })
          .on("click", function(d, i){return scope.onClick({data_pt: d});});



        
          scope.control.updateVis = function(){

            var xscale = d3.scale.linear()
                            .range([0, width])
                            .domain(d3.extent(scope.data, function(d) { 
                              return parseInt(d.index); 
                            }));

            var xAxis = d3.svg.axis()
                          .scale(xscale)
                          .orient("bottom");                            

            var yscale = d3.scale.linear()
                            .domain([0,8])
                            .range([height,0]);

            var yAxis = d3.svg.axis()
              .scale(yscale)
              .orient("left")
              .ticks(9)
              .tickFormat(function (d) {
                var mapper = {
                  0 : "No report",
                  1 : "Missing data",
                  2 : "Not at all",
                  3 : "Slightly",        
                  4 : "Mildly",
                  5 : "Moderately",
                  6 : "Severely",
                  7 : "Very severely",
                  8 : "Extremely"
                }
                return mapper[d]
            });

            // Select the section we want to apply our changes to
            // var svg = d3.select(element[0]).transition();

            // Make the changes
            // Change X Axis
            svg.select(".x.axis") 
              .transition()
              .duration(750)
              .call(xAxis);

            //     // Change Y Axis
            // svg.select(".y.axis")
            //   .duration(750)
            //   .call(yAxis);

            svg.selectAll("circle")
                    // .attr("class", ".dot")
                    .transition()
                    .attr("cx", function(d){
                      return xscale(d.index); 
                    })
                    // .on("click", function(d, i){return scope.onClick({data_pt: d});})
                    .duration(750);
          //end updateVis function
          };

          scope.control.revertVis = function(){
            var xscale = d3.scale.ordinal()
                            .domain([0,1])
                            .rangeRoundBands([0,width]);

            var yscale = d3.scale.linear()
                            .domain([0,8])
                            .range([height,0]);

            // Define the axes
            var xAxis = d3.svg.axis()
                          .scale(xscale)
                          .orient("bottom")
                          .tickFormat(function (d) {
                            var mapper = {
                              0 : "Condition a",
                              1 : "Condition b"
                            }
                            return mapper[d]
                          });

            // Select the section we want to apply our changes to
            // var svg = d3.select(element[0]).transition();

            // Make the changes
            // Change X Axis
            svg.select(".x.axis") 
              .transition()
              .duration(750)
              .call(xAxis);

            svg.selectAll("circle")
            .transition()
            // .attr("d", "circle")
            .attr("cx", function(d){
                    // change the "3" to vary spacing between points. 2 is 0 spacing since diameter.
                   return (margin.left - circleR/2 + 1)  + xscale(d.condition) + (d.offset * (circleR * 3)); 
                    // var y_move = d.discy - circleR;
                    // var position = "translate(" + x_move +   ",0)";
                   // return x_move;
                }) 
            .duration(750);

          // end revertVis function    
          };  


        // end d3 service
        });
      // end link
      }
      // template: '<button ng-click="updateVis()">Change Vis</button>'
      }
  }])
);