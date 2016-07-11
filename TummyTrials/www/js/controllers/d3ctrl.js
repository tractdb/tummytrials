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


(angular.module('d3.directives', ['d3','tummytrials.pasttrial1ctrl', 'tummytrials.vis'])
  .directive('resultVis', function(d3Service, $window, Vis) {

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
        scope.visdata = Vis;
        // var A_text = scope.visdata.A_text;
        // var B_text = scope.visdata.B_text;
        var A_text = 'Consume ' + scope.data[0].trigger;
        var B_text = 'Avoid ' + scope.data[0].trigger;

        // get flag for missing data / neg comp
        // if there is no missing/neg data point, then remove the bottom two rows from the vis
        var d_len = scope.data.length, bot_row;
        if(scope.data[d_len - 1].a_void > 0 || scope.data[d_len - 1].b_void > 0){
          bot_row = true;
        }else{
          bot_row = false;
        }

        d3Service.d3().then(function(d3) {
          // counter for number of datapoints
          var xcount = null;

          var parseDate = d3.time.format("%a, %b %e %Y").parse;
          scope.data.forEach(function(d) {
            d.date = parseDate(d.date);
            xcount += 1;
          });

          var cw = window.innerWidth;

          var margin = {top: 20, right: 30, bottom: 50, left: 60},
              width = cw - margin.left - margin.right,
              height = 340 - margin.top - margin.bottom;

          var color = d3.scale.ordinal()
                        .domain([0,1])
                        .range(['#FFA70F', '#0F85FF']);

          // radius of the data point
          var circleR = 9;

          if(bot_row == true){
            // draw the negative compliance and no report rows
              var yscale = d3.scale.linear()
                              .domain([0,8])
                              .range([height,20]); // range starts at 20 px offset from top to display title

              var yAxis = d3.svg.axis()
                  .scale(yscale)
                  .orient("left")
                  .ticks(9)
                  .tickFormat(function (d) {
                    var mapper = {
                      0 : "Negative compliance",
                      1 : "No report",
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
          } else {
            // hide the negative compliance and no report rows
              var yscale = d3.scale.linear()
                          .domain([2,8])
                          .range([height,20]); // range starts at 20 px offset from top to display title

              var yAxis = d3.svg.axis()
                  .scale(yscale)
                  .orient("left")
                  .ticks(7)
                  .tickFormat(function (d) {
                    var mapper = {
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
          }

          var xscale = d3.scale.ordinal()
                          .domain(scope.data.map(function(d) {
                            return d.condition; 
                          }))
                          .rangeRoundBands([0,width]);

          // Define the axes
          // 0 is consume trigger and 1 is avoid trigger
          var xAxis = d3.svg.axis()
              .scale(xscale)
              .orient("bottom")
              .tickFormat(function (d) {
                var mapper = {
                  0 : A_text,
                  1 : B_text
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

          // remove all previous items before rendering
          svg.selectAll('*').remove();

          var groups = {};
          var discreteTo = (circleR * 2) / (yscale.range()[0] / yscale.domain()[1]);
          scope.data.forEach (function(datum) {
              var g = Math.floor (datum.severity / discreteTo);
              var cat = datum.condition;
              var ref = cat+"-"+g;
              if (!groups[ref]) { groups[ref] = 0; }
              datum.groupIndex = groups[ref];
              datum.discy = yscale (datum.severity);
              groups[ref]++;
          });
          scope.data.forEach (function(datum) {
              var cat = datum.condition;
              var g = Math.floor (datum.severity / discreteTo);
              var ref = cat+"-"+g;
              datum.offset = datum.groupIndex - ((groups[ref] - 1) / 2);
          });

          // Add the X Axis
          svg.append("g")
              .attr("class", "x axis")
              .attr("transform", "translate(0," + height + ")")
              .call(xAxis)
            .selectAll(".tick text") // all formatting moved to the insertLinebreaks function
              .each(function(d,i){ 
                var mapper = {
                  0 : A_text,
                  1 : B_text
                };
                d = mapper[d];
                insertLinebreaks(this, d, xscale.rangeBand() ); 
              });
             

          if(bot_row == true){
              // remove the line for x axis since we're drawing a line above no reports
              svg.select(".domain")
                  .remove();

              // replacement for the X axis
              svg.append("line")
                  .attr("x1",0)
                  .attr("y1",207.5)
                  .attr("x2",width)
                  .attr("y2",207.5)
                  .attr("stroke-width", 1)
                  .attr("stroke", "black");

              svg.append("rect")
                .attr("x", 0)
                .attr("y", 207.5)
                .attr("width", width)
                .attr("height", 63)
                .attr("fill", "#eeeeee");
          } else {
              // do nothing
          }

          // Add the Y Axis
          svg.append("g")
              .attr("class", "y axis")
              .call(yAxis)
            .selectAll("text") // all formatting moved to the insertLinebreaks function
              .each(function(d,i){ 
                    var mapper = {
                      0 : "Negative compliance",
                      1 : "No report",
                      2 : "Not at all",
                      3 : "Slightly",        
                      4 : "Mildly",
                      5 : "Moderately",
                      6 : "Severely",
                      7 : "Very severely",
                      8 : "Extremely"
                    };
                d = mapper[d];
                insertYLinebreaks(this, d, 70 ); 
              });

          // manual hack till the offset issue is figured out
          // for some reason the vis aligns all points for cond A or B on iphone 6, but offsets in 5s and 6p
          var magic_num;
          if(width == 230){ // iphone 5s
            magic_num = -10;
          } else if(width == 285){ // iphone 6
            magic_num = 0;
          } else if(width == 324){ // iphone 6 plus
            magic_num = 13.5;
          } else {
            magic_num = 0;
          }

          svg.selectAll("circle").data(scope.data)
          .enter()
          .append("circle")
            // change the "3" to vary spacing between points. 2 is 0 spacing since diameter.
            .attr("cx", function(d) { 
              return (margin.left + circleR/2 + 3 + magic_num)  + xscale(d.condition) + (d.offset * (circleR * 3)); 
            }) 
            .attr("r", circleR)
            .attr("cy", function(d) { return d.discy; })
            .style ("fill", function(d) { 
                if(d.severity > 1){
                  return color(d.condition); 
                } else if(d.severity == 1){
                  return "#b6b6b6";
                  // return "#b8b8b8";
                } else if(d.severity == 0){
                  return "#b6b6b6";
                  // return "#f69c95";
                }

              })
          .on("click", function(d, i){return scope.onClick({data_pt: d});});

          // Animating the vis for the time line view
          scope.control.updateVis = function(){

            var xscale = d3.time.scale()
                            .range([0, width])
                            .domain(d3.extent(scope.data, function(d) { return d.date; }));

            var xAxis = d3.svg.axis()
                          .scale(xscale)
                          .ticks(xcount)
                          .orient("bottom");

            var svg = d3.selectAll('svg');

            svg.select(".x.axis") 
              .transition()
              .duration(750)
              .call(xAxis)
            .selectAll("text")
              .attr("transform", "rotate(-35)")
              .attr("x", -10)
              .attr("y", 10)
              .style("text-anchor", "end");

            if(bot_row == true){
              // remove the line for x axis since we're drawing a line above no reports
              svg.select(".domain")
                  .remove();
            }


            svg.selectAll("circle")
                    .transition()
                    .attr("cx", function(d){
                      return xscale(d.date); 
                    })
                    .duration(750);

          //end updateVis function
          };

          // Animating the vis back to the original view
          scope.control.revertVis = function(){
            
            var xscale = d3.scale.ordinal()
                            .domain([0,1])
                            .rangeRoundBands([0,width]);

            var xAxis = d3.svg.axis()
                          .scale(xscale)
                          .orient("bottom")
                          .tickFormat(function (d) {
                            var mapper = {
                              0 : A_text,
                              1 : B_text
                            }
                            return mapper[d]
                          });

            var svg = d3.selectAll('svg');

            svg.select(".x.axis") 
              .transition()
              .duration(750)
              .call(xAxis)
            .selectAll("text")
              // .attr("x", 0)
              // .attr("y", 20)
              // .style("font-size", "14px")
              .each(function(d,i){ 
                var mapper = {
                  0 : A_text,
                  1 : B_text
                };
                d = mapper[d];
                insertLinebreaks(this, d, xscale.rangeBand() ); 
              });

            if(bot_row == true){
              // remove the line for x axis since we're drawing a line above no reports
              svg.select(".domain")
                  .remove();
            }


            svg.selectAll("circle")
                .transition()
                .attr("cx", function(d){
                   return (margin.left + circleR/2 + 3)  + magic_num + xscale(d.condition) + (d.offset * (circleR * 3)); 
                }) 
            .duration(750);
          // end revertVis function    
          };  
        // end d3 service
        });


        function insertLinebreaks(t, d, width) {
            var el = d3.select(t);
            var p = d3.select(t.parentNode);
            p.append("foreignObject")
                .attr('x', -width/2)
                .attr('y', 20)
                .attr("width", width)
                .attr("height", 200)
                .style("font-size", "12px")
              .append("xhtml:p")
                .attr('style','word-wrap: break-word; text-align:center;')
                .html(d);    
            el.remove();
        };      

        function insertYLinebreaks(t, d, width) {
            var el = d3.select(t);
            var p = d3.select(t.parentNode);
            p.append("foreignObject")
                .attr("transform", "rotate(-35)")
                .attr('x', -width+2) // + 2 is for counteracting the rotation. 
                .attr('y', -21)
                .attr("width", width)
                .attr("height", 200)
                .style("font-size", "10px")
              .append("xhtml:p")
                .attr('style','word-wrap: break-word; text-align:center; vertical-align:middle;')
                .html(d);    
            el.remove();
        }; 
      // end link
      }
      }
  })
);
