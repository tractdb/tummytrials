// currentctrl.js     Controller for 'Current Trial' tab
//
// Calendar object is a shared service which maitains the value of the button being clicked in the calendar widget
// It has the following structure
// "button":    date / value of the button clicked.
// "date":      date in a readable format 
// "score":     contains array of objects for each symptom being logged
//      "symptom text": "symptom score"
//              symptom score is later converted to relevant description from likert
// "condition":"conditional prompt" conditional phrase for the day
// "state":     maintains the display state of the page has values:
//              a.o.k. : everything in order print it 
//              neg compliance : neg compliance, no score
//              no report : pos compliance but no report
// "A_text":    prompt for A condition
// "B_text":    prompt for B condition


'use strict';

(angular.module('tummytrials.currentctrl',
                [ 'tractdb.tdate', 'tractdb.reminders', 'tummytrials.lc',
                  'tummytrials.text', 'tummytrials.studyfmt',
                  'tummytrials.experiments', 'ionic', 'tummytrials.calendar',
                  'ngSanitize' ])

.controller('CurrentCtrl', function($scope, $state, LC, TextR, TDate, StudyFmt,
                                    Reminders, Experiments, ExperimentsR,
                                    $window, $ionicPopup, $timeout, Calendar) {

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

        //service data object
        $scope.calendardata = Calendar;

        var text = TextR;
        var cur = $scope.study_current;
        
        $scope.study_reminders = [];
        if (cur) {
            // Info for reminders.
            //     reportdue  report is due (bool)
            //     schedmsg   ex: 'Your breakfast reminder is set for 9 am.'
            //     logmsg     ex: 'Log Breakfast Compliance' (null => no button)
            //     disabled   button should be disabled (bool)
            //     logstate   ex: 'during' (angular-ui state for logging)
            //
            // var rinfo = [];

            // manual hack for different calendar sizes
              var sw = window.innerWidth;
              var fives = false, six = false, sixp = false;
              if(sw == 320){ // iphone 5s
                fives = true;
              } else if(sw == 375){ // iphone 6
                six = true;
              } else if(sw == 414){ // iphone 6 plus
                sixp = true;
              } else {
                six = true;
              }
              $scope.fives = fives;
              $scope.six = six;
              $scope.sixp = sixp;

            // Stuff dealing with the calendar widget
            $scope.today = new Date();
            $scope.today_readable = LC.dateonly($scope.today);
            $scope.today_full = LC.datestrfull($scope.today);
            $scope.today_md = LC.datemd($scope.today);

            $scope.start_date = new Date(cur.start_time * 1000);
            $scope.start_date_dtonly = LC.dateonly($scope.start_date);
            $scope.start_date_full = LC.datestrfull($scope.start_date);
            $scope.start_date_sday = LC.dayonly($scope.start_date);

            $scope.end_date = new Date(cur.end_time * 1000); // This is first day *after* the trial
            $scope.end_date.setDate($scope.end_date.getDate() - 1); // This is last day of the trial
            $scope.end_date_readable = LC.dateonly($scope.end_date);   
            $scope.end_date_sday = LC.dayonly($scope.end_date);

            //Figure out if experiment has started
            if($scope.today < $scope.start_date){
                $scope.exp_bool = true;
            } else {
                $scope.exp_bool = false;
            }

            //Get the duration of the experiment
            var dur = cur.end_time - cur.start_time;
            $scope.duration = new Date(dur * 1000); 
            $scope.duration_readable = LC.dateonly($scope.duration);

            //Determine the length of a row in the calendar widget
            if($scope.duration_readable <= 8){
                $scope.row_length = ($scope.duration_readable);
            } else if($scope.duration_readable > 8){
                $scope.row_length = ($scope.duration_readable/2);
            }

            //Figuring out the message for the day (avoid/consume the trigger)
            var A_text, B_text, h_URL;
            var text_loc = text.setup3.triggers; //Getting the text from JSON for each trigger

            for(i = 0; i < text_loc.length; i ++){
                if(cur.trigger == text_loc[i].trigger){ //Checking which trigger is being tested in the current experiment                    
                    A_text = text_loc[i].phrase_plus;
                    B_text = text_loc[i].phrase_minus;
                    h_URL = text_loc[i].uisref; // URL for help deciding what to eat for the condition
                }
            }

            $scope.legend_A_text = "Consume " + cur.trigger;
            $scope.legend_B_text = "Avoid " + cur.trigger;
            $scope.A_text = A_text;
            $scope.B_text = B_text;
            $scope.help_URL = h_URL;

            //Assign both prompts to calendar object
            Calendar.A_text = A_text;
            Calendar.B_text = B_text;

            // btn id
            // btn status : active/inactive
            // cond : A/B
            // date : num

            // Returns an array of the calendar for the study [day, condition] eg. [[15,"A","Sun",true],[16,"Mon","A",true],...
            var act_day = []; //Array for storing the condition of the day
            var days = []; // Array for filling the calendar widget 
            var d = []; // Temp array 
            var rand = cur.abstring.split(''); // Array for the randomization of conditions
            var day, dt, dy, btn_status = false;
            //Take the starting day, and keep adding one day till the end of study
            for (i = 0; i < $scope.duration_readable; i++ ){
                day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                dt = LC.dateonly(day);
                dy = LC.dayonly(day);
                btn_status = true;
                d.push(dt);
                d.push(rand[i]);
                d.push(dy);
                d.push(btn_status);
                days.push(d);
                if($scope.today_readable == dt){ //check the condition of the day (today)
                    act_day.splice(0,0,rand[i]);
                }
                d = [];
            }
            $scope.schedule = days; 

            // count the number of days into the study
            // used for figuring out which report to check for current day
            var day_pos, day_next, day_cond;
            for(var i = 0; i < days.length; i++){
                if($scope.today_readable == days[i][0]){
                    day_pos = i;
                    day_next = i+1;
                    // get text for the condition of the day
                    if(days[i][1] == "A"){
                        day_cond = $scope.legend_A_text;
                    } else if(days[i][1] == "B"){
                        day_cond = $scope.legend_B_text;
                    } 

                    if((i+1) != days.length){
                        // get text for the condition of next day
                        if(days[i+1][1] == "A"){
                            day_next = "<b>Tomorrow</b>: " + $scope.legend_A_text;
                        } else if(days[i+1][1] == "B"){
                            day_next = "<b>Tomorrow</b>: " + $scope.legend_B_text;
                        } 
                    } else {
                        day_next = "This is the last day of the trial! Please submit your trial to view the results.";
                    }

                }
            }
            $scope.day_cond = day_cond;
            $scope.day_next_cond = day_next;

            // condition for next day


            //Get the number of days into the experiment for calendar heading
            var day_n = null;
            for(var i = 0; i < $scope.duration_readable; i++){
                day = days[i][0];  // days is an array of arrays [[4,'A'],[5,'B']...] of the experiment date and condition
                if($scope.today_readable == day){
                    day_n = i;
                }
            }
            $scope.day_num = day_n + 1;

            // since days array is used in other calculations
            var cal_days = days;

            //find out how many buttons to append in first row. 
            var day_names_sr = ["S","M","T","W","T","F","S"];
            $scope.day_names = day_names_sr;

            var day_names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            var d, d_l = day_names.length;
            var st_dy, ed_dy;

            // Get the start day. Duration is available too.
            for(d = 0; d < d_l; d++){
                if($scope.start_date_sday == day_names[d]){
                    // d shows how many empty buttons need to be added in the first row
                    st_dy = d;
                }
            }

            // add all empty buttons
            // this happens whenever the first day is not a sunday
            var e, e_btn, row_num, btn_id = 0;
            for(e = 0; e < st_dy; e++){
                // [[date, day, cond, btn_status, row_num, btn_id]]
                // this should only be the first row
                row_num = "row_0";
                e_btn = [null, null, day_names[e], false]
                cal_days.splice(e, 0, e_btn);
            }


            var cal_row_num;
            if($scope.duration_readable < 9){
                cal_row_num = 2;
            } else if ($scope.duration_readable >= 9 && $scope.duration_readable <= 15) {
                cal_row_num = 3;
            } else if ($scope.duration_readable >=16 && $scope.duration_readable <= 22) {
                cal_row_num = 4;
            }

            // Over rides above calculation
            // if a 12 day trial starts on Sunday or Monday is ends within the next week
            if($scope.start_date_sday == "Sun" || $scope.start_date_sday == "Mon"){
                cal_row_num = 2;
            }

            // add all study buttons
            var d, s_l = cal_days.length;
            for(d = 0; d < s_l; d++){
                // cal_days[0] is [15,"A","Sun",true]
                // becomes [15, "A", "Sun", true, row_0, 0]
                if(btn_id < 7){
                    row_num = "row_" + 0;
                } else if(btn_id >= 7 && btn_id < 14){
                    row_num = "row_" + 1;
                } else if(btn_id >= 14 && btn_id < 20){
                    row_num = "row_" + 2;
                }

                cal_days[d].push(row_num, btn_id);
                btn_id++
            }

            // btn_id should be > 11 for a 12 day study.
            // row_num should be final above. no more rows needed. 
            var n;
            if(row_num == "row_1"){
                // for 2 rows max num of buttons is 14
                for(n = btn_id; n < 14; n++){
                    e_btn = [null, null, day_names[n - 7], false, row_num, btn_id]
                    cal_days.splice(n, 0, e_btn);
                    btn_id++;
                }                
            } else if(row_num == "row_2"){
                // for 3 rows max num of buttons is 21
                for(n = btn_id; n < 21; n++){
                    e_btn = [null, null, day_names[n - 14], false, row_num, btn_id]
                    cal_days.splice(n, 0, e_btn);
                    btn_id++;
                }
            }
            $scope.cal_days = cal_days;

            //Changes the text prompt based on the condition for the day
            if(act_day[0] == "A"){
                $scope.active_text = $scope.legend_A_text;
                $scope.active_bfst = cur.breakfast_on_prompt;
                $scope.active_drnk = cur.drink_on_prompt;
            } else if(act_day[0] == "B"){
                $scope.active_text = $scope.legend_B_text;
                $scope.active_bfst = cur.breakfast_off_prompt;
                $scope.active_drnk = cur.drink_off_prompt;
            }

            // Object mapping symptom score to values
            var sym_mapper = {
                  0 : "Not at all",
                  1 : "Slightly",        
                  2 : "Mildly",
                  3 : "Moderately",
                  4 : "Severely",
                  5 : "Very severely",
                  6 : "Extremely"
            };

            // Preparing messages to display when reports are present. 
            // Reported value for breakfast compliance 
            var bfst_comp_msg, bfst_comp_state = false, sym_score_state = false, 
                scr_val, scr_txt, scr_arr = [], sym_report_msg, 
                lcomp_state = false, lcomp_msg, lunch_comp = false,
                sym_submit = false;
            if(typeof(cur.reports[day_pos]) == "object"){
                if(cur.reports[day_pos].breakfast_compliance == false){
                    bfst_comp_msg = '<span class="assertive"><b> Did not </b>' + day_cond +'.</span><br/>'; 
                    bfst_comp_state = true;
                } else if(cur.reports[day_pos].breakfast_compliance == true){
                    bfst_comp_msg = "<b> Did </b>" + day_cond + ".<br/>";
                    bfst_comp_state = true;
                }

                if(typeof(cur.reports[day_pos].lunch_compliance) == "boolean"){
                    lcomp_state = true;
                    if(cur.reports[day_pos].lunch_compliance == true){
                        lcomp_msg = '<b>Did </b> fast.';
                    } else if(cur.reports[day_pos].lunch_compliance == false){
                        lcomp_msg = '<span class="assertive"></b> Did not</b> fast.</span>';
                    }                  
                }

                // Reported value for symptoms. If multiple symptoms, it is displayed as a single sentence summary
                if(typeof(cur.reports[day_pos].symptom_scores) == "object"){
                    var report_msg = "", temp_msg, sym_len;
                    for(var l = 0; l < cur.reports[day_pos].symptom_scores.length; l++){
                        scr_val = cur.reports[day_pos].symptom_scores[l].score;
                        scr_txt = cur.reports[day_pos].symptom_scores[l].name;
                        scr_val = sym_mapper[scr_val];
                        sym_len = cur.reports[day_pos].symptom_scores.length;

                        // updating symptom text
                        if(scr_val == "Extremely"){
                            scr_val = "Extreme";
                        } else if(scr_val == "Very Severely"){
                            scr_val = "Very Severe";
                        } else if(scr_val == "Severely"){
                            scr_val = "Severe";
                        } else if(scr_val == "Moderately"){
                            scr_val = "Moderate";
                        } else if(scr_val == "Mildly"){
                            scr_val = "Mild";
                        } else if(scr_val == "Slightly"){
                            scr_val = "Slight";
                        } else if(scr_val == "Not at all"){
                            scr_val = "Not at all";
                        }

                        // Punctuation logic
                        // Separate conditions for more or less than 2 symptoms
                        if(sym_len <= 2){
                            if(l < (sym_len - 1)){
                                temp_msg = scr_txt + ":<b> <br/>" + scr_val + "</b> <br/>";
                            } else if(l == (sym_len - 1)){
                                // last symptom in the array 
                                temp_msg = scr_txt + ":<b> <br/>" + scr_val + "</b><br/>";
                            }
                        } else if(sym_len > 2){
                            if(l < (sym_len - 1)){
                                temp_msg = scr_txt + ":<b> <br/>" + scr_val + "</b> <br/> ";
                            } else if(l == (sym_len - 2)){
                                temp_msg = scr_txt + ":<b> <br/>" + scr_val + "</b> <br/>";
                            } else if(l == (sym_len - 1)){
                                // last symptom in the array 
                                temp_msg = scr_txt + ":<b> <br/>" + scr_val + "</b><br/>";
                            }
                        }
                        report_msg = report_msg.concat(temp_msg);
                        sym_score_state = true;
                    }   
                }
                if(cur.reports[day_pos].confirmed == true){
                    sym_submit = true;
                }
            }
            $scope.bfst_comp_state = bfst_comp_state;
            $scope.bfst_comp_msg = bfst_comp_msg;
            $scope.lcomp_msg = lcomp_msg;
            $scope.lcomp_state = lcomp_state;
            $scope.sym_score_state = sym_score_state;
            $scope.report_msg = report_msg;
            $scope.sym_submit = sym_submit;

            var sym_list = "";
            for(var s = 0; s < cur.symptoms.length ; s++){
                sym_list = sym_list.concat(cur.symptoms[s] + "<br/>");
            }
            $scope.sym_list = sym_list;

            // calculating lunch reminder time for card
            // assuming that symptom entry reminder is the 3rd one in the list
            var bfst_rem = cur.remdescrs[1].time;
            $scope.bfst_rem = LC.timestr(bfst_rem);

            var sym_rem = cur.remdescrs[2].time;
            $scope.sym_rem = LC.timestr(sym_rem);

            // get time for breakfast reminder
            $scope.bfst_rem_time = LC.timestr(cur.remdescrs[1].time);


            // var rep_tally = Experiments.report_tally(cur);
            // cur.remdescrs.forEach(function(rd) {
            //     var info = {};
            //     info.reportdue =
            //         !rd.reminderonly &&
            //         rep_tally[rd.type] < Experiments.study_day_today(cur);
            //     info.disabled = false;
            //     var msg, name, reportmsg;
            //     msg = text.current.reminder_schedule_template;
            //     name = text.current[rd.type + '_reminder_name'] || rd.type; 
            //     msg = msg.replace('{NAME}', name);
            //     msg = msg.replace('{WHEN}', LC.timestr(rd.time || 0));
            //     info.schedmsg = msg;
            //     info.logmsg = text.current[rd.type + '_reminder_logmsg'];
            //     switch(rd.type) {
            //         case 'breakfast':
            //             info.logstate = 'during';
            //             info.reportmsg = bfst_comp_msg;
            //             if (bfst_comp_state == true) {
            //                 info.logmsg = 'Edit ' + info.logmsg;
            //             } else {
            //                 info.logmsg = 'Log ' + info.logmsg;
            //             }
            //             break;
            //         case 'symptomEntry':
            //             info.logstate = 'sec_comp';
                        
            //             // if breakfast compliance is reported pos/neg then the bfst_comp_state is true. Allow symptom logging.
            //             if(bfst_comp_state == true){
            //                 info.disabled = false;
            //             }else{
            //                 // else do not all symptom logging
            //                 info.disabled = true;
            //             }

            //             if(lcomp_state == true){
            //                 info.reportmsg = lcomp_msg + '<br/><br/>' + report_msg;
            //             }


            //             if (sym_score_state == true) {
            //                 info.logmsg = 'Edit ' + info.logmsg;
            //             } else {
            //                 info.logmsg = 'Log ' + info.logmsg;
            //             }
            //             break;
            //         default:
            //             info.logmsg = null;
            //             info.logstate = 'none';
            //             info.reportmsg = null;
            //             break;
            //     }
            //     rinfo.push(info);
            // });

            // $scope.study_reminders = rinfo;

            // Title of the study
            if(typeof(cur.trigger) == "string"){
                $scope.title = cur.trigger + " Trial"; //add this to all child pages of current. conditioning not required since not accessible unless study is going on
            } else {
                $scope.title = "Current Trial";
            }            

            // checking if the last day of study has passed
            var dtemp = $scope.today;
                dtemp = (dtemp.setDate(dtemp.getDate()) / 1000);
            var past = false; //if trial ongoing then false
            if(cur){
                if(dtemp > cur.end_time){
                    past = true; //if past trial date then true
                }
            }
            $scope.is_past = past;

            //Help toggle
            $scope.help = false;

            // The function for the 'Submit' button.
            // A pop up is displayed to verify if the user wants to submit. If the user responds with 'no' nothing is done.
            // $scope.submit_for_day = function() {
            //    var confirmPopup = $ionicPopup.confirm({
            //      title: '<h4>Confirm Submission<h4>',
            //      template: '<p>Are you sure you want to submit the report for the day? <br/>Once submitted, you will no longer be able to change your responses.</p>',
            //      buttons: [
            //             { 
            //                 text: '<b>No</b>',
            //                 onTap: function(e) { return false; } 
            //             },
            //             {
            //                 text: '<b>Yes</b>',
            //                 type: 'button-positive',
            //                 onTap: function(e) { return true; } 
            //             }]
            //    });

            //    confirmPopup.then(function(res) {
            //      if(res) {
            //         var sd = Experiments.study_day_today(cur);
            //         var dur = Experiments.study_duration(cur);
            //         if (sd <= 0 || sd > dur)
            //             // Study not in progress. Nothing to submit.
            //             //
            //             return;
            //         var rep = null;
            //         if (Array.isArray(cur.reports))
            //             rep = cur.reports[sd - 1];
            //         if (!rep)
            //             rep = Experiments.report_new(sd);
            //         rep.confirmed = true;
            //         rep.confirmed_time = Math.floor(TDate.now() / 1000);
            //         Experiments.put_report_p(cur.id, rep)
            //         .then(function(_) {
            //             // Reload the modified experiment.
            //             //
            //             return Experiments.getCurrent();
            //         })
            //         .then(function(cur2) {
            //             // Resync the reminders.
            //             //
            //             if (!cur2)
            //                 return null; // Shouldn't happen; but nothing to sync
            //             var rd = cur2.remdescrs;
            //             var st = cur2.start_time;
            //             var et = cur2.end_time;
            //             var rt = Experiments.report_tally(cur2);
            //             return Reminders.sync(rd, st, et, rt);
            //         })
            //         .then(function(_) {
            //             // variable for locking log buttons
            //             // submitted = true;
            //             // Reload current page.
            //             //
            //             $state.go($state.current, {}, { reload: true });
            //         });                
            //      } else {
            //         //do nothing
            //      }
            //    });
            // };

            // // Toggle for disabling logging buttons once report is submitted
            // $scope.sbmtd = false;
            // if (cur.reports && cur.reports[day_pos] && 
            //         cur.reports[day_pos].confirmed === true)
            //     $scope.sbmtd = true;

            // $scope.sym_scr_st = sym_score_state;

            // For detecting accelerated demo
            // If ttransform exists, then trail is being accelerated
            // if(typeof(cur.ttransform) == "object"){
            //     $scope.accelerated = true;
            //     $scope.exp_bool = false; // over-riding exp_bool to ignore date requirement
            // } else {
            //     $scope.accelerated = false;
            // }

            // Note button. Toggle add/edit and display note when available.
            var nt_btn = text.current.button3;
            $scope.nt_btn_txt = nt_btn;
            if(cur.reports &&
               cur.reports[day_pos] &&
               cur.reports[day_pos].note) {
                $scope.note = cur.reports[day_pos].note;
                $scope.nt_fg = true;
                nt_btn = nt_btn.replace('Add', 'Edit');
                $scope.nt_btn_txt = nt_btn;
            } else {
                $scope.note = "No note.";
                $scope.nt_fg = false;
            }

            console.log("Current trial ref: " + cur.id);

        }
})


//controller for calendar widget buttons
.controller('WidgetCtrl', function($scope, $stateParams, Calendar, TextR, ExperimentsR,
                        Text, Experiments, LC, StudyFmt){
    // Text.all_p()
    // .then(function(text) {
    //     $scope.text = text;
    //     return Experiments.publish_p($scope);
    // })
    // .then(function(_) {

        $scope.text = TextR;
        Experiments.set_study_context($scope, ExperimentsR);

        //service data object
        $scope.calendardata = Calendar;

        var text = TextR;

        // manual hack for different screen for back button width
        var sw = window.innerWidth;
        var btn_width;
        if(sw == 320){ // iphone 5s
            btn_width = 220;
        } else if(sw == 375){ // iphone 6
            btn_width = 260;
        } else if(sw == 414){ // iphone 6 plus
            btn_width = 290;
        } else {
            btn_width = 220;
        }
        $scope.btn_width = btn_width;

        var cur = $scope.study_current;
        $scope.duration_readable = Experiments.study_duration(cur);
        $scope.calendardata = Calendar;

        var report = [];
        var days = []; // Array for filling the calendar widget 
        var d = []; // Temp array 
        var rand = cur.abstring.split(''); // Array for the randomization of conditions
        var score = null;

        // report object format
        // {{["day, condition, report"]}} 
        // where day is the actual calendar date, condition is A or B and
        // report is the symptom severity case when it exists or null

            for(var i=0; i < $scope.duration_readable; i++){

                var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                var dt = LC.dateonly(day);
                var dtr = LC.datestrfull(day);
                var scr_val, scr_txt, scr_arr = [], score = {}, note_txt;
                d.push(dt);
                d.push(rand[i]);

                if(cur.reports[i] != null && cur.reports[i].hasOwnProperty('note')){
                    note_txt = cur.reports[i].note;
                } else {
                    note_txt = "No note.";
                }

                // no report object = nothing
                // report object = ?
                // bfst comp = true / false 
                // lnch comp = true / false
                // reports != null

                var bcomp = null, lcomp = null;

                if(cur.reports[i] == null){
                    if(dt == Calendar.button){
                        score["no report"] = "n/a";
                        Calendar.date = dtr;
                        Calendar.condition = rand[i];
                        Calendar.state = "no report";
                    } 
                    //print no report 
                    d.push(score);
                }
                else if(typeof(cur.reports[i]) == "object"){ // typeof(null) = object
                    // report is null when user did not report anything and day elapsed
                    // if(cur.reports[i] == null){
                    //     if(dt == Calendar.button){
                    //         score["no report"] = "n/a";
                    //         Calendar.date = dtr;
                    //         Calendar.condition = rand[i];
                    //         Calendar.state = "no report";
                    //     } 
                    //     //print no report 
                    //     d.push(score);
                    // }

                    if(typeof(cur.reports[i].breakfast_compliance) == "boolean"){
                        
                        // can log second compliance only after first one
                        if(cur.reports[i].breakfast_compliance == true){
                            bcomp = true;
                        }
                        else {
                            bcomp = false;
                        }

                        if(typeof(cur.reports[i].lunch_compliance) == "boolean"){
                            // can log symptoms only after second compliance
                            if(cur.reports[i].lunch_compliance == true){
                                lcomp = true;
                            }
                            else {
                                lcomp = false;
                            }

                            if(typeof(cur.reports[i].symptom_scores) == "object"){
                                
                                for(var l = 0; l < cur.reports[i].symptom_scores.length; l++){
                                    scr_val = cur.reports[i].symptom_scores[l].score;
                                    scr_txt = cur.reports[i].symptom_scores[l].name;
                                    scr_arr.push(scr_val);
                                    scr_arr.push(scr_txt);
                                    score[scr_txt] = scr_val;
                                }
                                
                                // adding details to calendar object
                                if(dt == Calendar.button){
                                    Calendar.date = dtr;
                                    Calendar.condition = rand[i];
                                    Calendar.score = score;
                                    Calendar.state = "a.o.k.";
                                    Calendar.lcomp = lcomp;
                                    Calendar.bcomp = bcomp;
                                    Calendar.note = note_txt;
                                }
                                d.push(score);
                            } else {
                                // no symptom report
                                if(dt == Calendar.button){
                                    score["score not reported"] = "n/a";
                                    Calendar.date = dtr;
                                    Calendar.condition = rand[i];
                                    Calendar.state = "eh.o.k.";
                                    Calendar.lcomp = lcomp;
                                    Calendar.bcomp = bcomp;
                                    Calendar.note = note_txt;
                                }
                                d.push(score);
                            } // end report 
                        } else {
                            // no lunch compliance
                            // console.log("this will be an issue with old schema which does not have lunch compliance");
                            if(dt == Calendar.button){
                                Calendar.date = dtr;
                                score["missing compliance"] = "can't report";
                                Calendar.condition = rand[i];
                                Calendar.state = "missing compliance";  
                                Calendar.bcomp = bcomp;
                                Calendar.note = note_txt;
                            } 
                            d.push(score);
                        } //end lunch comp

                        // if(typeof(cur.reports[i].note) == "string"){
                        //     console.log("day "+ i + " is string");
                        //     Calendar.note = cur.reports[i].note;
                        // }else{
                        //     console.log("day "+ i + " is NOT string");
                        //     Calendar.note = "No note.";
                        // }

                    } else {
                        // no bfst compliance
                        if(dt == Calendar.button){
                            Calendar.date = dtr;
                            score["missing compliance"] = "can't report";
                            Calendar.condition = rand[i];
                            Calendar.state = "missing compliance";  
                            Calendar.note = note_txt;
                        } 
                        d.push(score);
                    }//end bfst comp

                }
                days.push(d);
                d = [];
                score = null;
            }
            $scope.report = days;


            // Logic for controlling layout of calendar page
            var today = new Date();
            var today_readable = LC.dateonly(today);
            var today_full = LC.datestrfull(today);

            var d = []; // Temp array 
            //Take the starting day, and keep adding one day till the end of study
            for (var i = 0; i < $scope.duration_readable; i++ ){
                var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                var dt = LC.dateonly(day);
                d.push(dt);
            }
            $scope.schedule = d;

            // Display variable controls the content of calendar.html page.
            // If true i.e. date in the past, then show the details.
            // If false, i.e. date is in the future/today, then show text.
            var cal_index = null;
            var today_index = d.indexOf(today_readable);
            var display = null;
            // Looping over the array of dates 
            for(var j = 0; j < d.length; j++){
                cal_index = d.indexOf(Calendar.button);
                if(cal_index > today_index){
                    display = "no";
                } else if(cal_index == today_index) {
                    display = "today";
                } else {
                    // if everything is fine, show the report
                    if(Calendar.state == "a.o.k."){
                        $scope.cal_comp = "Positive (change text)";
                        $scope.cal_score = Calendar.score;
                        display = "yes";
                    } else if(Calendar.state == "eh.o.k."){
                        display = "guess";
                    } else if(Calendar.state == "missing compliance"){
                        $scope.cal_comp = "Missing (change text)";
                        display = "miss";
                    } else if(Calendar.state == "no report"){
                        display = "null";
                    }
                }
            } 
            
            Calendar.A_text = "Consume " + cur.trigger;
            Calendar.B_text = "Avoid " + cur.trigger;

            $scope.note = Calendar.note;
            // $scope.cal_bcomp = Calendar.bcomp;
            // $scope.cal_lcomp = Calendar.lcomp;
            $scope.cal_btn = Calendar.button;
            $scope.cal_day = Calendar.date;
            if(Calendar.condition == "A"){
                $scope.cal_cond = Calendar.A_text;
                if(Calendar.bcomp){
                    $scope.cal_bcomp = "<b>Did</b> " + Calendar.A_text;
                } else {
                    $scope.cal_bcomp = "<span class='assertive'><b>Did not</b> " + Calendar.A_text + "</span>";
                }

                if(Calendar.lcomp){
                    $scope.cal_lcomp = "<b>Did</b> fast."
                } else {
                    $scope.cal_lcomp = '<span class="assertive"><b>Did not</b> fast.</span>'
                }
            } else if(Calendar.condition == "B"){
                $scope.cal_cond = Calendar.B_text;
                if(Calendar.bcomp){
                    $scope.cal_bcomp = "<b>Did</b> " + Calendar.B_text;
                } else {
                    $scope.cal_bcomp = "<span class='assertive'><b>Did not</b> " + Calendar.B_text + "</span>";
                }

                if(Calendar.lcomp){
                    $scope.cal_lcomp = "<b>Did</b> fast."
                } else {
                    $scope.cal_lcomp = '<span class="assertive"><b>Did not</b> fast.</span>'
                }
            }
            //Figuring out text for the symptom score
            var text_loc = text.post.likertlabels; //Getting the text from JSON for each likert value
            for(var k = 0; k < text_loc.length; k ++){
                    for(var key in Calendar.score){
                        if(Calendar.score.hasOwnProperty(key)){
                            if(Calendar.score[key] == k){
                                // Calendar.score[key] = text_loc[k].label + " : " + text_loc[k].detail;
                                Calendar.score[key] = text_loc[k].label;
                                
                                // updating symptom text
                                if(Calendar.score[key] == "Extremely"){
                                    Calendar.score[key] = "Extreme";
                                } else if(Calendar.score[key] == "Very Severely"){
                                    Calendar.score[key] = "Very Severe";
                                } else if(Calendar.score[key] == "Severely"){
                                    Calendar.score[key] = "Severe";
                                } else if(Calendar.score[key] == "Moderately"){
                                    Calendar.score[key] = "Moderate";
                                } else if(Calendar.score[key] == "Mildly"){
                                    Calendar.score[key] = "Mild";
                                } else if(Calendar.score[key] == "Slightly"){
                                    Calendar.score[key] = "Slight";
                                } else if(Calendar.score[key] == "Not at all"){
                                    Calendar.score[key] = "Not at all";
                                }

                                
                            }
                        }
                    }
            }
            $scope.cal_scr = Calendar.score;

            $scope.cal_display = display;

            console.log("mode " + display); 

})

//module end
);
