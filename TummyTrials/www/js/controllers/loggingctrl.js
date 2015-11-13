// loggingctrl.js     Controllers for logging daily study results
//
// (These are known as reports in the code.)
//

(angular.module('tummytrials.loggingctrl',
                [ 'tractdb.reminders', 'tummytrials.text', 'tummytrials.lc',
                  'tummytrials.experiments' ])

.controller('LogDuringCtrl', function($scope, $state, $ionicHistory,
                                    Reminders, Text, LC, Experiments) {
    var text;
    var logday; // What study day is being logged

    function make_report(compliant)
    {
        var cur = $scope.study_current;

        Experiments.get_report_p(cur.id, logday)
        .then(function(report) {
            if (!report) report = {};
            report.study_day = logday;
            report.breakfast_compliance = compliant;
            report.breakfast_report_time = Math.floor(Date.now() / 1000);
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
            var state = compliant ? 'pos_compliance' : 'neg_compliance';
        
            // { location: 'replace' } is documented to replace our
            // current state in the history stack with the new state.
            // The new back button should skip over this log page and
            // lead back to the main screen for the current trial. This
            // apparently works in ui-routing, but the Ionic back button
            // doesn't work right. There have been calls to fix it for a
            // couple of years. The following is a hack from the Ionic
            // GitHub issue discussion:
            //
            //     https://github.com/driftyco/ionic/issues/1287
            //
            // If it stops working, maybe get a similar effect by
            // reloading the current state with new data (using ng-hide
            // and ng-show).
            //
            // It's also possible there's a supported way to make this
            // work. But nobody mentions it on the issue page.
            //
            $ionicHistory.currentView($ionicHistory.backView());

            $state.go(state, {}, { location: 'replace' });
        });
    }

    function compliant_yes() { make_report(true); }
    function compliant_no() { make_report(false); }

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

        // Caller assures us that we need to log a breakfast compliance.
        // Find the first study day without a breakfast report.
        //
        logday = 1;
        if (!Array.isArray(cur.reports))
            cur.reports = [];
        for (var i = 0; i < 10000; i++)
            if (!Experiments.report_made(cur.reports[i], 'breakfast')) {
                logday = i + 1;
                break;
            }

        // Compute a name for the day to be logged.
        //
        var logday_name;
        if (Experiments.study_day_today(cur) == logday) {
            logday_name = text.during.today;
        } else {
            var ldd = new Date(cur.start_time * 1000);
            ldd.setDate(ldd.getDate() + logday - 1);
            logday_name = LC.datestr(ldd);
        }
        $scope.log_title = text.during.title.replace(/{DAY}/g, logday_name);

        // Compute the phrase that says what they were supposed to do.
        //
        // XXX: need to choose between phrase_plus and phrase_minus
        // depending on the randomized choice for the day.
        //
        var phrase = "?";
        var trigger = cur.trigger.trim();
        for (var i = 0; i < text.setup3.triggers.length; i++)
            if (text.setup3.triggers[i].trigger == trigger) {
                phrase = text.setup3.triggers[i].phrase_plus;
                break;
            }

        $scope.log_subtitle = text.during.subtitle.replace(/{PHRASE}/g, phrase);
    
        // Functions for Yes / No buttons.
        //
        $scope.compliant_yes = compliant_yes;
        $scope.compliant_no = compliant_no;
    });
})

.controller('LogPostCtrl', function($scope, $state,
                                    Reminders, Text, LC, Experiments) {
    var text;
    var logday; // What study day is being logged

    function make_report(severity)
    {
        // XXX TEMP fix up later to handle multiple symptoms
        var cur = $scope.study_current;

        Experiments.get_report_p(cur.id, logday)
        .then(function(report) {
            if (!report) report = {}; // (Shouldn't happen, breakfast is first.)
            report.study_day = logday;
            report.symptom_scores = [
                { name: cur.symptoms[0], score: Number(severity) }
            ];
            report.symptom_report_time = Math.floor(Date.now() / 1000);
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
        .then(function(_) { $state.go('current'); });
    }

    function do_cancel()
    {
        $scope.log_model.severity = null;
        $state.go('current');
    }

    function do_submit()
    {
        if ($scope.log_model.severity == null)
            // (Not supposed to be possible.)
            //
            return;
        make_report($scope.log_model.severity);
    }

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
            // best we can do is probably go back to current trial
            // screen.
            //
            $state.go('current');
        }

        // Caller assures us that we need to log symptom severity. Find
        // Find the first study day without a symptom report.
        //
        logday = 1;
        if (!Array.isArray(cur.reports))
            cur.reports = [];
        for (var i = 0; i < 10000; i++)
            if (!Experiments.report_made(cur.reports[i], 'symptomEntry')) {
                logday = i + 1;
                break;
            }

        // Compute a name for the day to be logged.
        //
        var logday_name;
        if (Experiments.study_day_today(cur) == logday) {
            logday_name = text.post.today;
        } else {
            var ldd = new Date(cur.start_time * 1000);
            ldd.setDate(ldd.getDate() + logday - 1);
            logday_name = LC.datestr(ldd);
        }
        $scope.log_title = text.post.title.replace(/{DAY}/g, logday_name);

        $scope.log_subtitle = text.post.subtitle;

        // Model for the severity; null => not selected yet.
        //
        $scope.log_model = { severity: null };

        // Functions for Cancel / Submit buttons.
        //
        $scope.log_cancel = do_cancel;
        $scope.log_submit = do_submit;
    })
})

);
