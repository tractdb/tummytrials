// currentctrl.js     Controller for 'Current Trial' tab
//

'use strict';

(angular.module('tummytrials.currentctrl',
                ['tummytrials.lc', 'tummytrials.text',
                 'tummytrials.experiments'])

.controller('CurrentCtrl', function($scope, LC, Text, Experiments) {
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
            //     disabled   button (if any) should be disabled (bool)
            //     schedmsg   ex: 'Your breakfast reminder is set for 9 am.'
            //     logmsg     ex: 'Log Breakfast Compliance' (can be null)
            //     logstate   ex: 'during' (angular-ui state for logging)
            //
            var rinfo = [];
            cur.remdescrs.forEach(function(rd) {
                var info = {};
                // XXX The idea here is to track whether there's a
                // report due for the reminder. Need to fix up when
                // reports are working.
                //
                info.reportdue = !rd.reminderonly;
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
                        case 'breakfast': info.logstate = 'during'; break;
                        case 'symptomEntry': info.logstate = 'post'; break;
                        default: info.logstate = 'none'; break;
                    }
                }
                rinfo.push(info);
            });

            // Want to disable all but the first button for which a
            // report is due.
            //
            var enable = true;
            rinfo.forEach(function(ri) {
                if (ri.reportdue && enable) {
                    ri.disabled = false;
                    enable = false;
                } else {
                    ri.disabled = true;
                }
            });

            $scope.study_reminders = rinfo;
        }
    });
})

);
