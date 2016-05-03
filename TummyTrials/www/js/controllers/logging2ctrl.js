// loggingctrl.js     Controllers for logging daily study results
//
// (These are known as reports in the code.)
//

(angular.module('tummytrials.logging2ctrl',
                [ 'tractdb.tdate', 'tractdb.reminders',
                  'tummytrials.text', 'tummytrials.lc',
                  'tummytrials.experiments', 'tummytrials.symptomdata' ])

.controller('LogDuring2Ctrl', function($scope, $state, $ionicHistory,
                                        TDate, Reminders, Text, LC,
                                        Experiments) {
    var text;
    var logday; // What study day is being logged

    function make_report(compliant, resp)
    {
        var cur = $scope.study_current;

        Experiments.get_report_p(cur.id, logday)
        .then(function(report) {
            if (!report)
                report = Experiments.report_new(logday);
            if(resp == 'yes'){
                report.lunch_compliance = true;    
            } else if(resp == 'no'){
                report.lunch_compliance = false;
            }
            
            report.lunch_report_time = Math.floor(TDate.now() / 1000);
            return Experiments.put_report_p(cur.id, report);
        })
        .then(function(_) {
            // Refetch current study with report.
            //
            return Experiments.get(cur.id);
        })
        .then(function(curex) {
            // Sync the reminder state with new version of study.
            //
            var rd = curex.remdescrs;
            var st = curex.start_time;
            var et = curex.end_time;
            var rt = Experiments.report_tally(curex);
            return Reminders.sync(rd, st, et, rt);
        })
        .then(function(_) {
            // var state = 'post({symptomIndex:0})';
            // // { location: 'replace' } is documented to replace our
            // // current state in the history stack with the new state.
            // // The new back button should skip over this log page and
            // // lead back to the main screen for the current trial. This
            // // apparently works in ui-routing, but the Ionic back button
            // // doesn't work right. There have been calls to fix it for a
            // // couple of years. The following is a hack from the Ionic
            // // GitHub issue discussion:
            // //
            // //     https://github.com/driftyco/ionic/issues/1287
            // //
            // // If it stops working, maybe get a similar effect by
            // // reloading the current state with new data (using ng-hide
            // // and ng-show).
            // //
            // // It's also possible there's a supported way to make this
            // // work. But nobody mentions it on the issue page.
            // //
            // $ionicHistory.currentView($ionicHistory.backView());

            // $state.go(state, {}, { location: 'replace' });
        });
    }

    function compliant_yes() { make_report(true, 'yes'); }
    // allow reporting symptoms in either case
    function compliant_no() { make_report(true, 'no'); }

    Text.all_p()
    .then(function(alltext) {
        text = alltext;
        $scope.text = alltext;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var cur = $scope.study_current;

        if (!cur) {
            // This should not be possible. If caller screwed up, the
            // best we can do is probably go back to current trial.
            //
            $state.go('current');
        }

// No need to figure out the day. All log entries are for today.
//
//      // Caller assures us that we need to log a breakfast compliance.
//      // Find the first study day without a breakfast report.
//      //
//      logday = 1;
//      if (!Array.isArray(cur.reports))
//          cur.reports = [];
//      for (var i = 0; i < 10000; i++)
//          if (!Experiments.report_made(cur.reports[i], 'breakfast')) {
//              logday = i + 1;
//              break;
//          }

        if (!Array.isArray(cur.reports))
            cur.reports = [];
        logday = Experiments.study_day_today(cur);

        // Compute a name for the day to be logged.
        //
        var logday_name;
        if (Experiments.study_day_today(cur) == logday) {
            logday_name = text.during.today;
        } else {
            var ldd = new TDate(cur.start_time * 1000);
            ldd.setDate(ldd.getDate() + logday - 1);
            logday_name = LC.datestr(ldd);
        }
        $scope.log_title = text.during.title.replace(/{DAY}/g, logday_name);

        // Compute the phrase that says what they were supposed to do.
        //
        var phrase = "?";
        var abstring = String(cur.abstring);
        var plusday = abstring.substr(logday - 1, 1) == "A";
        var trigger = cur.trigger.trim(); // (Obsolescent fixup.)
        for (var i = 0; i < text.setup3.triggers.length; i++)
            if (text.setup3.triggers[i].trigger == trigger) {
                if (plusday)
                    phrase = text.setup3.triggers[i].phrase_plus;
                else
                    phrase = text.setup3.triggers[i].phrase_minus;
                break;
            }

        $scope.log_subtitle = text.during.subtitle.replace(/{PHRASE}/g, phrase);
    
        // Functions for Yes and No buttons.
        //
        $scope.compliant_yes = compliant_yes;
        $scope.compliant_no = compliant_no;
    });
})


);
