// loggingctrl.js     Controllers for logging daily study results
//
// (These are known as reports in the code.)
//

(angular.module('tummytrials.loggingctrl',
                [ 'tractdb.tdate', 'tractdb.reminders',
                  'tummytrials.text', 'tummytrials.lc',
                  'tummytrials.experiments', 'tummytrials.symptomdata' ])

.controller('LogDuringCtrl', function($scope, $state, $ionicHistory,
                                        TDate, Reminders, Text, LC,
                                        Experiments) {
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
            report.breakfast_report_time = Math.floor(TDate.now() / 1000);
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

.controller('LogPostCtrl', function($scope, $state, $stateParams,
                            TDate, Reminders, Text, LC, Experiments,
                            SymptomData) {
    var text;
    var logday; // What study day is being logged

    function make_report_p(severity)
    {

        var cur = $scope.study_current;

        return Experiments.get_report_p(cur.id, logday)
        .then(function(report) {
            if (!report) report = {}; // (Shouldn't happen, breakfast is first.)
            report.study_day = logday;
            var scores = [];
            for (var i = 0; i < cur.symptoms.length; i++) {
                var s = {};
                s.name = cur.symptoms[i];
                s.score = Number(severity[s.name] || 0);
                scores.push(s);
            }
            report.symptom_scores = scores;
            report.symptom_report_time = Math.floor(TDate.now() / 1000);
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
            // Clear severity levels for next time.
            //
            $scope.log_model.severity = null;
            for (s in SymptomData.severity)
                delete SymptomData.severity[s];

            $state.go('current');
        });
    }

    function do_cancel()
    {
        $scope.log_model.severity = null;
        for (s in SymptomData.severity)
            delete SymptomData.severity[s];
        $state.go('current');
    }

    function do_next()
    {
        // (Caller warrants that there is another symptom to log.)
        //
        var symix = Number($stateParams.symptomIndex);
        $state.go('post', { symptomIndex: symix + 1 });
    }

    function do_submit()
    {
        // (Caller warrants that all symptoms are logged.)
        //
        var cur = $scope.study_current;
        var symix = Number($stateParams.symptomIndex);
        SymptomData.severity[cur.symptoms[symix]] =
            Number($scope.log_model.severity);
        for (var i = 0; i < cur.symptoms.length; i++)
            if (!(cur.symptoms[i] in SymptomData.severity)) {
                // (Missing a symptom severity level. Caller appears to
                // be misguided.)
                //
                return;
            }
        make_report_p(SymptomData.severity);
    }

    var symix = $stateParams.symptomIndex;

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

        // Move severity level from $scope.log_model.severity to
        // SymptomData.severity when leaving the view. This catches
        // cases (like the Back button) where we can't easily get
        // control.
        //
        $scope.$on('$ionicView.leave', function() {
            if ($scope.log_model.severity !== null)
                SymptomData.severity[cur.symptoms[symix]] =
                    $scope.log_model.severity;
            else
                delete SymptomData.severity[cur.symptoms[symix]];
        });

//      // Caller assures us that we need to log symptom severity. Find
//      // the first study day without a symptom report.
//      //
//      logday = 1;
//      if (!Array.isArray(cur.reports))
//          cur.reports = [];
//      for (var i = 0; i < 10000; i++)
//          if (!Experiments.report_made(cur.reports[i], 'symptomEntry')) {
//              logday = i + 1;
//              break;
//          }

// No need to figure out the day to log. All logging is for today.
//
        logday = Experiments.study_day_today(cur);

        // Compute a name for the day to be logged.
        //
        var logday_name;
        if (Experiments.study_day_today(cur) == logday) {
            logday_name = text.post.today;
        } else {
            var ldd = new TDate(cur.start_time * 1000);
            ldd.setDate(ldd.getDate() + logday - 1);
            logday_name = LC.datestr(ldd);
        }
        $scope.log_title = text.post.title.replace(/{DAY}/g, logday_name);

        // Name of symptom.
        //
        $scope.log_symptom = cur.symptoms[symix];

        // Compute the question to ask.
        //
        $scope.log_subtitle =
            text.post.subtitle.replace(/{SYMPTOM}/g, cur.symptoms[symix]);

        // Model for the severity; null => not selected yet.
        //
        var slev;
        if (cur.symptoms[symix] in SymptomData.severity)
            slev = SymptomData.severity[cur.symptoms[symix]];
        else
            slev = null;
        $scope.log_model = { severity: slev };

        // Settings for Cancel and Next/Submit buttons.
        //
        $scope.log_cancel = do_cancel;
        if (symix >= cur.symptoms.length - 1) {
            // No more symptoms; we want Submit button.
            //
            $scope.log_submitnext_label = text.post.submit;
            $scope.log_submitnext = do_submit;
        } else {
            // More symptoms to log; we want Next button.
            //
            $scope.log_submitnext_label = text.post.next;
            $scope.log_submitnext = do_next;
        }
    })
})

);
