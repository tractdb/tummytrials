// lc.js     Formatting functions that should probably be localized someday
//

'use strict';

(angular.module('tummytrials.lc', [])
    .factory('LC', function() {
        return {
            datestr: function(d) {
                // Return a string for the date (or tdate). It looks
                // like "Tue, Nov 3".
                //
                var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                var mons = ["Jan","Feb","Mar","Apr","May","Jun",
                            "Jul","Aug","Sep","Oct","Nov","Dec"];
                return days[d.getDay()] + ", " + mons[d.getMonth()] + " " +
                        d.getDate();
            },

            dayonly: function(d) {
                // Return a string for the date (or tdate). It looks
                // like "Tue".
                //
                var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                return days[d.getDay()];
            },

            datemd: function(d) {
                // Return a string for the date (or tdate). It looks
                // like "Nov 3".
                //
                var mons = ["Jan","Feb","Mar","Apr","May","Jun",
                            "Jul","Aug","Sep","Oct","Nov","Dec"];
                return mons[d.getMonth()] + " " + d.getDate();
            },

            datestrfull: function(d) {
                // Return a string for the date (or tdate). It looks
                // like "Tuesday, Nov 3".
                //
                var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                var mons = ["Jan","Feb","Mar","Apr","May","Jun",
                            "Jul","Aug","Sep","Oct","Nov","Dec"];
                return days[d.getDay()] + ", " + mons[d.getMonth()] + " " +
                        d.getDate();
            },

            dateonly: function(d){
                // Return a string for the date without the day and month. 
                // It looks like 3
                //
                return d.getDate();
            },

            // being used in the visualization for the result
            fulldate: function(d){
                // Return a string for the date without the day and month. 
                // It looks like "Tue, Nov 3 2015"
                //
                var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                var mons = ["Jan","Feb","Mar","Apr","May","Jun",
                            "Jul","Aug","Sep","Oct","Nov","Dec"];
                return days[d.getDay()] + ", " + mons[d.getMonth()] + " " +
                        d.getDate() + " " + d.getFullYear();
            },

            timestr: function(sec) {
                // Return string for the given number of seconds after
                // midnight. It looks like '9:15 am'.
                //
                var hrs = Math.floor(sec / 3600);
                var min = Math.floor((sec % 3600) / 60);
                var ampm = 'am';

                if (hrs == 0) {
                    hrs = 12;
                    if (min == 0)
                        ampm = 'midnight';
                } else if (hrs == 12 && min == 0) {
                    ampm = 'noon';
                } else if (hrs >= 12) {
                    if (hrs > 12) hrs -= 12;
                    ampm = 'pm';
                }

                return hrs + ':' + ('0' + String(min)).substr(-2) + ' ' + ampm;
            }
        };
    })
);
