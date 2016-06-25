// settingsctrl.js     Controller for Settings pane
//

(angular.module('tummytrials.settingsctrl',
                [ 'tractdb.tdate', 'tractdb.reminders', 'tummytrials.text',
                  'tummytrials.login', 'tummytrials.experiments' ])

.controller('SettingsCtrl', function($scope, TDate, Reminders, Login,
                                     $state, $timeout, TextR, LC, 
                                     $ionicPopup, Experiments, ExperimentsR) {
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

    // An elaborate, custom popup to abandon ongoing trial
    $scope.abandon_trial = function(){
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
                        return Experiments.setAbandon_p(cur.id, status, reason)
                          .then(function(_){
                                $state.go('mytrials');
                          });
                     } else {
                     }
              })
              
            // }
      } else {
        // $scope.cur_exp = false;
      }
    };

    $scope.complete_trial = function(){
        var cur = $scope.study_current;
        if(cur.status == "active"){
            return Experiments.setStatus(cur.id, "ended")
            .then(function(_){
              $state.go('mytrials');
            });
        }
    };

    $scope.text = TextR;
    Experiments.set_study_context($scope, ExperimentsR);

    $scope.have_credentials = Login.loginfo_exists(username_tag);
    $scope.clear_credentials = clear_credentials;
    $scope.demo_is_possible = demo_is_possible();
    $scope.begin_demo = begin_demo;

    // Stuff related to current trial

    $scope.cur = false;
    var cur =  $scope.study_current;
    if(cur){

      var start_day = cur.name;
      $scope.start_day = start_day.replace("Trial beginning ", "");

      $scope.sym = cur.symptoms;

      //end_time is the last day + 1
      var not_end_date = cur.end_time;
      var end_date = not_end_date - 86400;
      var today = Math.round(Date.now()/1000);
      var complete = false , abandon = false;

      //experiment has elapsed
      if(today > not_end_date){
        complete = true;
      } else if(today >= end_date && today <= not_end_date){
        // this is the last day of the trial
        // check for evening reminder or check if values exist
        var last_report = cur.reports[Experiments.study_duration(cur) - 1];
        if(last_report.breakfast_compliance == false){
          // if complaince is false then last day report is over
          complete = true;
        } else if(last_report.breakfast_compliance == true){
            if(typeof(last_report.symptom_scores) == "object"){
            // if compliance was true check if scores reported.
            complete = true;
            }
        }
      } else if(today < end_date){
        //experiment still on going
        abandon = true;
      }

      var c_rem = cur.remdescrs, 
          s_rem = {}, r_time, r_type;
      for(var c = 0; c < c_rem.length ; c++){

        r_time = LC.timestr(c_rem[c].time);
        r_type = c_rem[c].type;
        if(r_type == "morning"){
          r_type = "Daily condition";
        } else if(r_type == "breakfast"){
          r_type = "Breakfast compliance";
        } else if(r_type == "symptomEntry"){
          r_type = "Fast compliance and Symptom Report";
        } else if(r_type == "evening"){
          r_type = "Evening";
        }

        s_rem[r_type] = r_time;
      }
      $scope.rem = s_rem;
        
      $scope.comp = complete;
      $scope.abdn = abandon;
      $scope.cur = true;
    }

    
})
);
