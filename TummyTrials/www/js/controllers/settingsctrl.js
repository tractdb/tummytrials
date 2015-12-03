// settingsctrl.js     Controller for Settings pane
//

(angular.module('tummytrials.settingsctrl',
                [ 'tractdb.tdate', 'tractdb.reminders', 'tummytrials.text',
                  'tummytrials.login', 'tummytrials.experiments' ])

.controller('SettingsCtrl', function($scope, TDate, Reminders, Text, Login,
                                     Experiments) {
    var username_tag = 'couchuser'; // XXX shared with replicator.js

    function clear_credentials()
    {
        Login.loginfo_clear(username_tag);
        $scope.have_credentials = Login.loginfo_exists(username_tag);
    }

    function demo_is_possible()
    {
        // A demo is possible iff there is a current study that hasn't
        // started yet, and there's no ongoing demo.
        //
        if (!$scope.study_current)
            return false;
        var tt = $scope.study_current.ttransform;
        if (Object(tt) == tt)
            return false; // There is ongoing demo
        return Experiments.study_day_today($scope.study_current) < 1;
    }

    function begin_demo()
    {
        // Start the demo. For now, accelerate the study so it runs in
        // an hour. Set the beginning of the study (midnight of first
        // day) to right now.
        //
        var cur = $scope.study_current;

        var speedup = (cur.end_time - cur.start_time) / (60 * 60);

        // Algebra:
        //
        //     T(Date.now()) = starting_timestamp
        //     T(Date.now()) = cur.start_time * 1000
        //     speedup * Date.now() + offset = cur.start_time * 1000
        //     offset = cur.start_time * 1000 - speedup * Date.now()

        var offset = cur.start_time * 1000 - speedup * Date.now();

        Experiments.set_ttransform_p(cur.id, speedup, offset)
        .then(function(_) {
            return Experiments.getCurrent();
        })
        .then(function(curex) {
            $scope.study_current = curex;
            $scope.demo_is_possible = demo_is_possible(); // Should be false
            TDate.setTransform(speedup, offset);
            var rd = curex.remdescrs;
            var st = curex.start_time;
            var et = curex.end_time;
            var rt = Experiments.report_tally(curex);     // Should be {}
            return Reminders.sync(rd, st, et, rt);
        });
    }

    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        $scope.have_credentials = Login.loginfo_exists(username_tag);
        $scope.clear_credentials = clear_credentials;
        $scope.demo_is_possible = demo_is_possible();
        $scope.begin_demo = begin_demo;
    });
})
);
