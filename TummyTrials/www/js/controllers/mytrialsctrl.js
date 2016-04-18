(angular.module('tummytrials.mytrialsctrl',
                ['tummytrials.lc','tummytrials.text', 'ionic', 'tummytrials.experiments'])

.controller('MyTrialsCtrl', function($scope, $state, $timeout, Text, LC, $ionicPopup, Experiments) {

	// An elaborate, custom popup to abandon ongoing trial
    $scope.abandon_trial = function(){
    	console.log("function called");
      $scope.reason = {};
        var cur = $scope.study_current;
        var status = null;
        if(cur.status == "active"){
              var myPopup = $ionicPopup.show({
                template: '<input type="text" ng-model="reason.abandon">',
                title: 'Abandon trial',
                subTitle: 'Are you sure you want to abandon this trial? If so, please state your reason for abandoning.',
                scope: $scope,
                buttons: [
                  { text: 'Continue Trial' },
                  {
                    text: '<b>Abandon</b>',
                    type: 'button-royal',
                    onTap: function(e) {
                       if (!$scope.reason.abandon) {
                         //don't allow the user to close unless she enters the reason
                         e.preventDefault();
                       } else {
                         return $scope.reason.abandon;
                       }
                    }
                  }
                ]
              });

              myPopup.then(function(res) {
                    if(res) {
                        var status = "abandoned";
                        var reason = $scope.reason.abandon;
                        $ionicPopup.alert({
                            title: 'Abandon successful',
                            template: 'The ' + cur.trigger + ' trial has been abandoned.'
                        });
                        return Experiments.setAbandon_p(cur.id, status, reason);
                     } else {
                       console.log('You are not sure');
                     }
              }).then(function(_){
                if(cur.status == "abandoned"){
                    $state.go('mytrials');
                }
              });
              
            // }
      } else {
        // $scope.cur_exp = false;
      }
    };

    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_){
    	// var cur =  $scope.study_current;

     //  $scope.start_date_md = LC.datemd(new Date(study.start_time * 1000));

     //  $scope.end_date_md = LC.datemd(end_date.setDate((new Date(study.end_time * 1000)).getDate() - 1));  

    });
})

);
