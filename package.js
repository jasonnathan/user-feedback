Package.describe({
  name: 'jasonnathan:user-feedback',
  version: '0.4.6',
  // Brief, one-line summary of the package.
  summary: 'A self-contained user feedback module for Meteor',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/jasonnathan/user-feedback.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
  api.use('mongo', ['server']);
  api.use('templating');
  api.use('accounts-base');
  api.addFiles('user-feedback.html','client');
  api.addFiles('user-feedback.css','client');
  api.addFiles('user-feedback.js','client');
  api.addFiles('user-feedback-server.js','server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('jasonnathan:user-feedback');
  api.addFiles('user-feedback-tests.js');
});
