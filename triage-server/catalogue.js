/* catalogue.js
   The cards the AI is allowed to choose from, per page ("scope"). The ids MUST match the card ids used in the
   wizard pages. `signs` describes what the screen or photo looks like, and is the only thing the AI sees about
   each card, so keep it concrete (exact on-screen words, colours, buttons). Add a card here when you add one
   to the wizard. */
'use strict';

module.exports = {
  handset: [
    { id: 'handset-screensaver', title: 'Screen Saver / Inactive Display',
      signs: 'The handset screen is blank, dark or showing a screensaver or clock, as if asleep. No error text.' },
    { id: 'handset-blue-info', title: 'Stuck on the Blue Info Screen',
      signs: 'A blue screen titled "Floorsight Handset" listing hardware, boot and build version, with a small X in the top-left corner, instead of the normal home screen.' },
    { id: 'handset-bootloader', title: 'Stuck on the Bootloader Screen',
      signs: 'A screen listing hardware, application and radio details with a "Reboot" button, instead of the handset starting up.' },
    { id: 'handset-x-screen', title: 'Stuck on an "X" Screen',
      signs: 'The handset screen shows a single large white X (the handset is disconnected or not configured).' },
    { id: 'handset-power-on', title: 'Stuck on the "Power On" Screen',
      signs: 'The handset screen shows the words "Power On" (often with a spinner) and stays there; the buttons do not respond.' },
    { id: 'handset-diagnostics', title: 'Handset Diagnostics',
      signs: 'Not a photo of a handset: a screenshot of the Floorsense admin portal, such as a floor plan with pale or grey desk icons (offline pucks) or an Offline Desks report.' }
  ],
  mobile: [
    { id: 'mobile-existing-user', title: 'Existing User',
      signs: 'Registration in the Floorsense mobile app fails because an account already exists for that email address.' },
    { id: 'mobile-account-missing', title: 'User Account Does Not Exist',
      signs: 'Login in the mobile app shows the error "Selected user account does not exist".' },
    { id: 'mobile-forgot-password', title: 'Forgot My Password',
      signs: 'The mobile app login page, or a password reset prompt; the user cannot remember their password.' },
    { id: 'mobile-setup-code', title: 'Where to Find the Setup Code',
      signs: 'The mobile app asks the user to enter a Setup Code and the user does not have or cannot find it.' },
    { id: 'mobile-not-loading', title: 'App Is Not Loading',
      signs: 'The Floorsense mobile app is stuck on a loading or downloading screen, or shows a loading error.' },
    { id: 'mobile-white-screen', title: 'White Screen',
      signs: 'The mobile app shows an empty white screen with no floor plan or content.' },
    { id: 'mobile-cannot-tap-in', title: 'I Cannot Tap In, Check In or Confirm My Booking',
      signs: 'Tapping in, checking in or confirming a desk booking in the mobile app fails, or the tap-in prompt does not work.' },
    { id: 'mobile-booking-gone', title: 'My Booking Is Gone',
      signs: 'A desk booking has disappeared from the mobile app and the desk shows as available.' }
  ]
};
