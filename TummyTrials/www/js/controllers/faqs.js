(angular.module('tummytrials.faqcontroller',['ionic'])

.config(function($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('pvalue', {
      url: '/pvalue',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/pvalue.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('abdominalpain', {
      url: '/abdominalpain',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/abdominalpain.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('bloating', {
      url: '/bloating',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/bloating.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('urgency', {
      url: '/urgency',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/urgency.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('diarrhea', {
      url: '/diarrhea',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/diarrhea.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('constipation', {
      url: '/constipation',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/constipation.html',
          controller: 'setupcontroller'
        }
      }
    })
    .state('triggerchoice', {
      url: '/triggerchoice',
      views: {
        faqs : {
          templateUrl: 'templates/faqs/triggerchoice.html',
          controller: 'setupcontroller'
        }
      }
    })
  })
);