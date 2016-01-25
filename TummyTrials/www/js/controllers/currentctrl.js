// currentctrl.js     Controller for 'Current Trial' tab
//

'use strict';

(angular.module('tummytrials.currentctrl',
                [ 'tummytrials.lc', 'tummytrials.text',
                  'tummytrials.experiments' ])

//remove $window after done testing calendar widget
.controller('CurrentCtrl', function($scope, LC, Text, Experiments, $window) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var text = $scope.text;
        var cur = $scope.study_current;
        $scope.study_reminders = [];
        if (cur && cur.remdescrs) {
            // Info for reminders.
            //     reportdue  report is due (bool)
            //     schedmsg   ex: 'Your breakfast reminder is set for 9 am.'
            //     logmsg     ex: 'Log Breakfast Compliance' (null => no button)
            //     disabled   button should be disabled (bool)
            //     logstate   ex: 'during' (angular-ui state for logging)
            //
            var rinfo = [];

            // If the user falls behind in reporting, there can be
            // reports due for days in the past. Or there can be reports
            // due now or sometime later today. We'll guide the user to
            // make the earliest such report. So figure out its type.
            //
            var rep_type = null; // Next report to make; null => done thru today
            var sdn = Math.min(Experiments.study_day_today(cur),
                               Experiments.study_duration(cur));

            found: for (var sd = 1; sd <= sdn; sd++) {
                if (!cur.reports || !cur.reports[sd - 1]) {
                    // No report object at all; so, first report of day
                    // is earliest report due.
                    //
                    for (var i = 0; i < cur.remdescrs.length; i++) {
                        if (!cur.remdescrs[i].reminderonly) {
                            rep_type = cur.remdescrs[i].type;
                            break found;
                        }
                    }
                    break found; // (No reportable reminders at all?)
                }
                var rsd = cur.reports[sd - 1];
                for (var i = 0; i < cur.remdescrs.length; i++) {
                    if (cur.remdescrs[i].reminderonly)
                        continue;
                    var ty = cur.remdescrs[i].type;
                    if (!Experiments.report_made(rsd, ty)) {
                        rep_type = ty;
                        break found;
                    }
                }
            }

            var rep_tally = Experiments.report_tally(cur);

            cur.remdescrs.forEach(function(rd) {
                var info = {};
                info.reportdue =
                    !rd.reminderonly &&
                    rep_tally[rd.type] < Experiments.study_day_today(cur);
                info.disabled = rd.type != rep_type;
                var msg, name;
                msg = text.current.reminder_schedule_template;
                name = text.current[rd.type + '_reminder_name'] || rd.type;
                msg = msg.replace('{NAME}', name);
                msg = msg.replace('{WHEN}', LC.timestr(rd.time || 0));
                info.schedmsg = msg;
                if (rd.reminderonly) {
                    info.logmsg = null;
                    info.logstate = 'none';
                } else {
                    info.logmsg = text.current[rd.type + '_reminder_logmsg'];
                    info.logmsg = info.logmsg || ('Log ' + rd.type);
                    switch(rd.type) {
                        case 'breakfast':
                            info.logstate = 'during';
                            break;
                        case 'symptomEntry':
                            info.logstate = 'post({symptomIndex:0})';
                            break;
                        default:
                            info.logstate = 'none';
                            break;
                    }
                }
                rinfo.push(info);
            });

            $scope.study_reminders = rinfo;

            // Stuff dealing with the calendar widget

            $scope.today = new Date();
            $scope.today_readable = LC.dateonly($scope.today);


            $scope.start_date = new Date(cur.start_time * 1000);
            $scope.start_date_dtonly = LC.dateonly($scope.start_date);
            $scope.start_date_full = LC.datestrfull($scope.start_date);

            $scope.end_date = new Date(cur.end_time * 1000); // This is first day *after* the trial
            $scope.end_date.setDate($scope.end_date.getDate() - 1); // This is last day of the trial
            $scope.end_date_readable = LC.dateonly($scope.end_date);   

            //Get the number of days into the experiment
            $scope.day_num = $scope.today_readable - $scope.start_date_dtonly + 1;

            var dur = cur.end_time - cur.start_time;
            $scope.duration = new Date(dur * 1000); 
            $scope.duration_readable = LC.dateonly($scope.duration);

            //Determine the length of a row in the calendar widget
            $scope.row_length = ($scope.duration_readable/2);

            var days = []; // Array for filling the calendar widget 
            //Take the starting day, and keep adding one day till the end of study
            for (i = 0; i < $scope.duration_readable; i++ ){
                
                var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                var dt = LC.dateonly(day);
                days.push(dt);

            }
            $scope.schedule = days;
            

            $scope.selected_date = function(day){
                $scope.selected_date = $scope.day;
                $window.alert($scope.day);
            }


            // Daily reports
            // Will be used to color the tabs in the calendar widget. 
            // Condition A/B get separate colors
            // Should compliance be overloaded? Can do multicolor gradient or something

            var report = [];
            for(i=0; i < $scope.duration_readable; i++){
                if(typeof(cur.reports[i]) == "object"){
                    //day reported
                    if(cur.reports[i].breakfast_compliance == true){
                        //symptoms recorded
                        var day_report = cur.reports[i].symptom_scores;
                        report.push("Day " + (i+1) + " report: ", day_report);
                    } else {
                        // print no compliance
                        report.push("No compliance on day " + (i+1));
                    }
                } else {
                    //print no report 
                        report.push("No report for day " + (i+1));
                }
            }
            $scope.report = report;

        }
    });


})

);
