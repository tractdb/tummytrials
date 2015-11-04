(angular.module('tummytrials.pasttrial1ctrl',
                ['tummytrials.text', 'tummytrials.experiments',
                 'tummytrials.studyfmt'])

.controller('PastTrial1Ctrl', function($scope, $stateParams,
                                        Text, Experiments, StudyFmt) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var study = $scope.study_previous[$stateParams.studyIndex];
        $scope.study_past1 = study;
        return StudyFmt.new_p(study);
    })
    .then(function(studyfmt) {
        $scope.study_topic_question = studyfmt.topicQuestion();
        $scope.study_date_range = studyfmt.dateRange();
        $scope.study_reminder_times = studyfmt.reminderTimes();
    });
})

);
