// login.js     Get validated username/password
//
// The values are obtained from the user, then cached in local storage.
// Keep asking until username/password is validated, validation seems to
// be impossible, or user gives up.
//

(angular.module('tummytrials.login', [ 'ionic' ])

.factory('Login', function($window, $q, $ionicModal) {
    return {
        loginfo_p:
            function(storekey, scope, text, valid_p) {
                // Return a promise for a validated username and
                // password. The promise resolves to an object like
                // this (let's call it unpw):
                //
                //     { username: 'xxx', password: yyy' }
                //
                // Validation is not always possible (as when the
                // Internet is unavailable). If validated info can't be
                // obtained, the promise resolves to null.
                //
                // Caller provides the following:
                //
                //     storekey <string> key for saving in local store
                //     scope <ng-scope>  scope in which to interact w user
                //     text <object>     text to appear on the screen
                //     valid_p <fn>      function returning promise to validate
                //
                // Example text argument:
                //     {
                //       header: 'Tummy Trials Login',
                //       badinfo: 'The username or password was invalid.',
                //       usertag: 'Username',  // tag for username field
                //       passtag: 'Password',  // tag for password field
                //       loginb: 'Login',      // button text
                //       cancelb: 'Cancel'     // button text
                //     }
                //
                // Call to valid_p looks like this:
                //
                //     valid_p(unpw)
                //
                // valid_p() resolves to true if the unpw are valid,
                // false if they aren't valid. If validation can't be
                // performed, valid_p() fails.
                //
                // Note: we write some values named loginfo_xxx into the
                // scope.
                //
                // Object saved to local storage looks like a unpw
                // object, but has an internal Boolean field "validated"
                // that tracks whether the info has been validated.
                // 

                function askuser_p(prevct)
                {
                    // Return a promise to get and then validate
                    // username/password from user. Resolve to a unpw
                    // object or to null if user cancels. Fail if there
                    // is a serious problem.
                    //
                    // Caller supplies prevct, the number of times the
                    // user has been asked already since the beginning
                    // of the current interaction.
                    //
                    var tfn = 'templates/loginfo.html';
                    var opts = { scope: scope };
                    scope.loginfo_text = text;
                    scope.loginfo_prevct = prevct;
                    return $ionicModal.fromTemplateUrl(tfn, opts)
                    .then(
                        function(modal) {
                            var def = $q.defer();
                            scope.loginfo_info = {};
                            scope.loginfo_login = function() {
                                var info = scope.loginfo_info;
                                if (!info.username) info.username = '';
                                if (!info.password) info.password = '';
                                info.validated = false;
                                var jinfo = JSON.stringify(info);
                                $window.localStorage.setItem(storekey, jinfo);
                                modal.remove()
                                .then(function() { def.resolve(info); });
                            };
                            scope.loginfo_cancel = function() {
                                // (Remove any saved credentials when
                                // user cancels.)
                                //
                                $window.localStorage.removeItem(storekey);
                                modal.remove()
                                .then(function() { def.resolve(null); });
                            };
                            modal.show();
                            return def.promise
                            .then(function(unpw) {
                                if (!unpw) return null;
                                return validate_p(prevct + 1, unpw);
                            });
                        },
                        function(err) {
                            // For now, treat modal creation failure as
                            // if user canceled.
                            //
                            return null;
                        }
                    );
                }

                function validate_p(prevct, unpw)
                {
                    // Return a promise to validate the given username
                    // and password. If not valid, ask again.
                    //
                    // Caller also supplies prevct as above.
                    //
                    return valid_p(unpw)
                    .then(
                        function good(valid) {
                            if (valid) {
                                unpw.validated = true;
                                var jinfo = JSON.stringify(unpw);
                                $window.localStorage.setItem(storekey, jinfo);
                                delete unpw.validated;
                                return unpw;
                            } else {
                                return askuser_p(prevct);
                            }
                        },
                        function bad(err) {
                            // If validation fails, give up.
                            //
                            return null;
                        }
                    );
                }

                // If info is in local storage, start from there.
                //
                var unpwjason;
                if (unpwjason = $window.localStorage.getItem(storekey)) {
                    var unpw = JSON.parse(unpwjason);
                    if (unpw.validated) {
                        // (We already have validated info; just resolve
                        // to it.)
                        //
                        delete unpw.validated; // Internal attr
                        var def = $q.defer();
                        def.resolve(unpw);
                        return def.promise;
                    } else {
                        // (There was no network when we tried to
                        // validate; try again now.)
                        //
                        return validate_p(1, unpw);
                    }
                }

                // If not in local storage, start from scratch.
                //
                return askuser_p(0);
            },

        loginfo_clear: function(storekey) {
            // Clear any login info stored under the given key.
            //
            $window.localStorage.removeItem(storekey);
        }
    };
})
);
