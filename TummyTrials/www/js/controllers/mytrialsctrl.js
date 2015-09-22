(angular.module('tummytrials.mytrialsctrl',
                ['tummytrials.text', 'tummytrials.experiments'])

.controller('MyTrialsCtrl', function($scope, Text, Experiments) {
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.getCurrent();
    })
    .then(function(curexper) {
        $scope.current_experiment = curexper;
    });
})

);
