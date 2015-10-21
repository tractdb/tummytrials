(angular.module('tummytrials.currentstudy',['ionic'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
	.state('no_study', {
      url: '/no_study',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/no_study.html',
          controller: 'setupcontroller'
        }
      }
    })    
  .state('during', {
      url: '/during',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/during.html',
          controller: 'setupcontroller'
        }
      }
    })     
  .state('post', {
      url: '/post',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/post.html',
          controller: 'setupcontroller'
        }
      }
    }) 
  .state('notes', {
      url: '/notes',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/notes.html',
          controller: 'setupcontroller'
        }
      }
    }) 
    .state('neg_compliance', {
      url: '/neg_compliance',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/neg_compliance.html',
          controller: 'setupcontroller'
        }
      }
    }) 
    .state('pos_compliance', {
      url: '/pos_compliance',
      views: {
        settings : {
          templateUrl: 'templates/currenttrial/pos_compliance.html',
          controller: 'setupcontroller'
        }
      }
    }) 

  })
);