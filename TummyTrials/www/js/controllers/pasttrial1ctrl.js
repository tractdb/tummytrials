(angular.module('tummytrials.pasttrial1ctrl',
                ['tummytrials.text', 'tummytrials.experiments',
                 'tummytrials.studyfmt','tummytrials.currentctrl', 'tummytrials.lc'])

.controller('PastTrial1Ctrl', function($scope, $stateParams,
                                        Text, Experiments, StudyFmt, LC) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var study = $scope.study_previous[$stateParams.studyIndex];
        $scope.study_past1 = study;

        //gather all data needed for report + vis 
        var cur = study;
        $scope.nm = name;
        
        //Get the duration of the experiment
        var dur = cur.end_time - cur.start_time;
        $scope.duration = new Date(dur * 1000); 
        $scope.duration_readable = LC.dateonly($scope.duration);

        var report = [];
        var days = []; // Array for filling the calendar widget 
        var d = []; // Temp array 
        var rand = cur.abstring.split(''); // Array for the randomization of conditions
        var score = null;

            for(i=0; i < $scope.duration_readable; i++){

                var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                var dt = LC.dateonly(day);
                // var score = cur.reports[i].symptom_scores;
                var score = null;
                d.push(dt);
                d.push(rand[i]);

                if(typeof(cur.reports[i]) == "object"){
                    //report logged if there is an object

                    if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) == "object"){
                        //symptoms exist if compliance is true
                        // console.log(typeof(cur.reports[i].symptom_scores));
                        score = cur.reports[i].symptom_scores[0].score;
                        // report.push("Day " + (i+1) + " report: ", day_report);
                        d.push(score);
                    } else {
                        // print no compliance
                        // report.push("No compliance on day " + (i+1));
                        d.push(null);
                    }
                } else {
                    //print no report 
                    //report.push("No report for day " + (i+1));
                    d.push(null);
                }
                days.push(d);
                d = [];
                score = null;
                console.log(days); //this is working as expected. shows the correct values in the array.
            }
            // console.log("\n");
            // console.log(days);
            $scope.report = days;

        return StudyFmt.new_p(study);
    })
    .then(function(studyfmt) {
        $scope.study_topic_question = studyfmt.topicQuestion();
        $scope.study_date_range = studyfmt.dateRange();
        $scope.study_reminder_times = studyfmt.reminderTimes();
    });
})

);
