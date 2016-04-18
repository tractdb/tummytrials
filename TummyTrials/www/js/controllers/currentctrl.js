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
                [ 'tummytrials.lc', 'tummytrials.text', 'tummytrials.studyfmt',
                  'tummytrials.experiments', 'ionic', 'tummytrials.calendar', 'ngSanitize' ])

.controller('CurrentCtrl', function($scope, $state, LC, Text, Experiments, 
                                        $window, $ionicPopup, $timeout, Calendar) {

    Text.all_p()
        .then(function(text) {
            $scope.text = text;
            return Experiments.publish_p($scope);
        })
        .then(function(_) {

        //service data object
        $scope.calendardata = Calendar;

        var text = $scope.text;
        var cur = $scope.study_current;
        $scope.study_reminders = [];
        if (cur && cur.remdescrs) {
            // Info for reminders.
            //     reportdue  report is due (bool)
            //     schedmsg   ex: 'Your breakfast reminder is set for 9 am.'
            //     logmsg     ex: 'Log Breakfast Compliance' (null => no button)
            //     disabled   button should be disabled (bool)
            //     logstate   ex: 'during' (angular-ui state for logging)
            //
            var rinfo = [];

// We're going to require the user to enter the info for each day on the
// day itself. So, no falling behind.
//
//
//          // If the user falls behind in reporting, there can be
//          // reports due for days in the past. Or there can be reports
//          // due now or sometime later today. We'll guide the user to
//          // make the earliest such report. So figure out its type.
//          //
//          var rep_type = null; // Next report to make; null => done thru today
//          var sdn = Math.min(Experiments.study_day_today(cur),
//                             Experiments.study_duration(cur));

//          found: for (var sd = 1; sd <= sdn; sd++) {
//              if (!cur.reports || !cur.reports[sd - 1]) {
//                  // No report object at all; so, first report of day
//                  // is earliest report due.
//                  //
//                  for (var i = 0; i < cur.remdescrs.length; i++) {
//                      if (!cur.remdescrs[i].reminderonly) {
//                          rep_type = cur.remdescrs[i].type;
//                          break found;
//                      }
//                  }
//                  break found; // (No reportable reminders at all?)
//              }
//              var rsd = cur.reports[sd - 1];
//              for (var i = 0; i < cur.remdescrs.length; i++) {
//                  if (cur.remdescrs[i].reminderonly)
//                      continue;
//                  var ty = cur.remdescrs[i].type;
//                  if (!Experiments.report_made(rsd, ty)) {
//                      rep_type = ty;
//                      break found;
//                  }
//              }
//          }

            // Stuff dealing with the calendar widget
            $scope.today = new Date();
            $scope.today_readable = LC.dateonly($scope.today);
            $scope.today_full = LC.datestrfull($scope.today);

            $scope.start_date = new Date(cur.start_time * 1000);
            $scope.start_date_dtonly = LC.dateonly($scope.start_date);
            $scope.start_date_full = LC.datestrfull($scope.start_date);

            $scope.end_date = new Date(cur.end_time * 1000); // This is first day *after* the trial
            $scope.end_date.setDate($scope.end_date.getDate() - 1); // This is last day of the trial
            $scope.end_date_readable = LC.dateonly($scope.end_date);               

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
                
            // Returns an array of the calendar for the study [day, condition] eg. [[13,"A"],[14,"B"], ... ]
            var act_day = []; //Array for storing the condition of the day
            var days = []; // Array for filling the calendar widget 
            var d = []; // Temp array 
            var rand = cur.abstring.split(''); // Array for the randomization of conditions
            //Take the starting day, and keep adding one day till the end of study
            for (i = 0; i < $scope.duration_readable; i++ ){
                var day = new Date((cur.start_time + (86400 * i)) * 1000);  //86400 adds 1 day
                var dt = LC.dateonly(day);
                d.push(dt);
                d.push(rand[i]);
                days.push(d);
                if($scope.today_readable == dt){ //check the condition of the day (today)
                    act_day.splice(0,0,rand[i]);
                }
                d = [];
            }
            $scope.schedule = days; 

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
            $scope.A_text = A_text;
            $scope.B_text = B_text;
            $scope.help_URL = h_URL;

            //Assign both prompts to calendar object
            Calendar.A_text = A_text;
            Calendar.B_text = B_text;

            //Changes the text prompt based on the condition for the day
            if(act_day[0] == "A"){
                $scope.active_text = A_text;
                $scope.active_bfst = cur.breakfast_on_prompt;
                $scope.active_drnk = cur.drink_on_prompt;
            } else if(act_day[0] == "B"){
                $scope.active_text = B_text;
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

            // count the number of days into the study
            // used for figuring out which report to check for current day
            var day_pos, day_cond;
            for(var i = 0; i < days.length; i++){
                if($scope.today_readable == days[i][0]){
                    day_pos = i;
                    // get text for the condition of the day
                    if(days[i][1] == "A"){
                        day_cond = A_text;
                    } else if(days[i][1] == "B"){
                        day_cond = B_text;
                    } 
                }
            }

            // Preparing messages to display when reports are present. 
            // Reported value for breakfast compliance 
            var bfst_comp_msg, bfst_comp_state = false, sym_score_state = false, 
                scr_val, scr_txt, scr_arr = [], sym_report_msg;
            if(typeof(cur.reports[day_pos]) == "object"){
                if(cur.reports[day_pos].breakfast_compliance == false){
                    bfst_comp_msg = "You reported that you <b> did not </b>" + day_cond; 
                    bfst_comp_state = true;
                } else if(cur.reports[day_pos].breakfast_compliance == true){
                    bfst_comp_msg = "You reported that you <b> did </b>" + day_cond;
                    bfst_comp_state = true;
                }

                // Reported value for symptoms. If multiple symptoms, it is displayed as a single sentence summary
                if(cur.reports[day_pos].breakfast_compliance == true && typeof(cur.reports[day_pos].symptom_scores) == "object"){
                    // if symptoms exist and compliance is true
                    var report_msg = "You reported ", temp_msg, sym_len;
                    for(var l = 0; l < cur.reports[day_pos].symptom_scores.length; l++){
                        scr_val = cur.reports[day_pos].symptom_scores[l].score;
                        scr_txt = cur.reports[day_pos].symptom_scores[l].name;
                        scr_val = sym_mapper[scr_val];
                        sym_len = cur.reports[day_pos].symptom_scores.length;

                        // Punctuation logic
                        // Separate conditions for more or less than 2 symptoms
                        if(sym_len <= 2){
                            if(l < (sym_len - 1)){
                                temp_msg = "<b>" + scr_txt + "</b> impacted you " + "<b>" + scr_val + "</b> and ";
                            } else if(l == (sym_len - 1)){
                                // last symptom in the array 
                                temp_msg = "<b>" + scr_txt + "</b> impacted you " +  "<b>" + scr_val + "</b>.";
                            }
                        } else if(sym_len > 2){
                            if(l < (sym_len - 1)){
                                temp_msg = "<b>" + scr_txt + "</b> impacted you " + "<b>" + scr_val + "</b>, ";
                            } else if(l == (sym_len - 2)){
                                temp_msg = "<b>" + scr_txt + "</b> impacted you " + "<b>" + scr_val + "</b> and ";
                            } else if(l == (sym_len - 1)){
                                // last symptom in the array 
                                temp_msg = "<b>" + scr_txt + "</b> impacted you " + "<b>" + scr_val + "</b>.";
                            }
                        }
                        report_msg = report_msg.concat(temp_msg);
                        sym_score_state = true;
                    }   
                }
            }

            var rep_tally = Experiments.report_tally(cur);

            cur.remdescrs.forEach(function(rd) {
                var info = {};
                info.reportdue =
                    !rd.reminderonly &&
                    rep_tally[rd.type] < Experiments.study_day_today(cur);
                // info.disabled = rd.type != rep_type;
                info.disabled = false;
                var msg, name, reportmsg;
                msg = text.current.reminder_schedule_template;
                name = text.current[rd.type + '_reminder_name'] || rd.type; 
                msg = msg.replace('{NAME}', name);
                msg = msg.replace('{WHEN}', LC.timestr(rd.time || 0));
                info.schedmsg = msg;
                if (rd.reminderonly) {
                    info.logmsg = null;
                    info.selected_value = null;
                    info.reportmsg = null;
                } else {
                    info.logmsg = text.current[rd.type + '_reminder_logmsg'];
                    // info.logmsg = info.logmsg || ('Log ' + rd.type);
                    switch(rd.type) {
                        case 'breakfast':
                            info.logstate = 'during';
                            info.reportmsg = bfst_comp_msg;
                            if(bfst_comp_state == true){
                                info.logmsg = 'Edit ' + info.logmsg;
                            }else{
                                info.logmsg = 'Log ' + info.logmsg;
                            }
                            break;
                        case 'symptomEntry':
                            info.logstate = 'post({symptomIndex:0})';
                            info.reportmsg = report_msg;

                            if(sym_score_state == true){
                                info.logmsg = 'Edit ' + info.logmsg;
                            }else{
                                info.logmsg = 'Log ' + info.logmsg;
                            }
                            break;
                        default:
                            info.logstate = 'none';
                            info.reportmsg = null;
                            break;
                    }
                }
                rinfo.push(info);
            });

            $scope.study_reminders = rinfo;


            // Title of the study
            if(typeof(cur.trigger) == "string"){
                $scope.title = cur.trigger + " Study";    //add this to all child pages of current. conditioning not required since not accessible unless study is going on
            } else {
                $scope.title = "Current Study";
            }            

            // checking if the last day of study has passed
            if(cur){
                var past = false; //if trial ongoing then false
                var past_one = new Date((cur.end_time) * 1000);
                var past_one_readable = LC.dateonly(past_one);
                if($scope.today_readable == past_one_readable){
                    past = true; //if past trial date then true
                }
            }
            $scope.is_past = past;

            //Get the number of days into the experiment for calendar heading
            var day_n = null;
            for(var i = 0; i < $scope.duration_readable; i++){
                day = days[i][0];  // days is an array of arrays [[4,'A'],[5,'B']...] of the experiment date and condition
                if($scope.today_readable == day){
                    day_n = i;
                }
            }
            $scope.day_num = day_n + 1;

            //Help toggle
            $scope.help = false;

            // For detecting accelerated demo
            // If ttransform exists, then trail is being accelerated
            if(typeof(cur.ttransform) == "object"){
                $scope.accelerated = true;
                $scope.exp_bool = false; // over-riding exp_bool to ignore date requirement
            } else {
                $scope.accelerated = false;
            }

            $scope.exp_id = cur.id;
        }
    });
})


//controller for calendar widget buttons
.controller('WidgetCtrl', function($scope, $stateParams, Calendar,
                        Text, Experiments, LC, StudyFmt){
    Text.all_p()
    .then(function(text) {
        $scope.text = text;
        return Experiments.publish_p($scope);
    })
    .then(function(_) {
        var text = $scope.text;
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
                var scr_val, scr_txt, scr_arr = [], score = {};
                d.push(dt);
                d.push(rand[i]);

                if(typeof(cur.reports[i]) == "object"){
                    // report is null when user did not report anything and day elapsed
                    if(cur.reports[i] == null){
                        if(dt == Calendar.button){
                            score["no report"] = "n/a";
                            Calendar.date = dtr;
                            Calendar.condition = rand[i];
                            Calendar.state = "no report";
                        } 
                        //print no report 
                        d.push(score);
                    //report logged if there is an object
                    } else if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) == "object"){
                        // if symptoms exist and compliance is true
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
                        }
                        d.push(score);
                    // if compliance is true but score not reported
                    } else if(cur.reports[i].breakfast_compliance == true && typeof(cur.reports[i].symptom_scores) != "object"){
                        // Calendar.score = "not reported";
                        if(dt == Calendar.button){
                            score["score not reported"] = "n/a";
                            Calendar.date = dtr;
                            Calendar.condition = rand[i];
                            Calendar.state = "eh.o.k.";
                        }
                        d.push(score);
                    } else if(cur.reports[i].breakfast_compliance == false){
                        // print no compliance
                        if(dt == Calendar.button){
                            Calendar.date = dtr;
                            // Calendar.score = "can't report";
                            score["neg compliance"] = "can't report";
                            Calendar.condition = rand[i];
                            Calendar.state = "neg compliance";
                        } 
                        d.push(score);
                    }
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
                        $scope.cal_comp = "Positive (change text)";
                        display = "yes";
                    } else if(Calendar.state == "eh.o.k."){
                        display = "guess";
                    } else if(Calendar.state == "neg compliance"){
                        $scope.cal_comp = "Negative (change text)";
                        display = "neg";
                    } else if(Calendar.state == "no report"){
                        display = "null";
                    }
                }
            } 
            
            $scope.cal_btn = Calendar.button;
            $scope.cal_day = Calendar.date;
            if(Calendar.condition == "A"){
                $scope.cal_cond = Calendar.A_text;
            } else if(Calendar.condition == "B"){
                $scope.cal_cond = Calendar.B_text;
            }
            //Figuring out text for the symptom score
            var text_loc = text.post.likertlabels; //Getting the text from JSON for each likert value
            for(var k = 0; k < text_loc.length; k ++){
                    for(var key in Calendar.score){
                        if(Calendar.score.hasOwnProperty(key)){
                            if(Calendar.score[key] == k){
                                Calendar.score[key] = text_loc[k].label + " : " + text_loc[k].detail;
                            }
                        }
                    }
            }
            $scope.cal_scr = Calendar.score;
            $scope.cal_scr_txt = Calendar.score_text;

           $scope.cal_display = display;

    });
})

//module end
);
