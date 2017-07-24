(function () {
    'use strict';

    /*The service will be responsible for starting and stopping recognition sessions
    and handling the speech input from users.*/

     angular.module('app')
         .factory('speechRecognitionService', speechRecognitionService);

    speechRecognitionService.$inject = ['$window', '_', '$rootScope'];

    function speechRecognitionService($window, _, $rootScope) {
        // Check for browser support - Firefox or Chrome
        var SpeechRecognition = $window.SpeechRecognition
            || $window.webkitSpeechRecognition;

        var recognizer;
        // Create a state variable to check the status of the speech recognition object before trying to start the engine
        var isRecognizing = false;
        var autoRestart = false;

        var commands = [];

        var noMatchCallback;
        var unrecognizedCallback;

        var service = {
            startRecognition: startRecognition,
            stopRecognition: stopRecognition,
            addCommand: addCommand,
            clearCommands: clearCommands,
            setNoMatchCallback: setNoMatchCallback,
            setUnrecognizedCallback: setUnrecognizedCallback
        };

        activate();

        // Check if the SpeechRecognition variable is defined before trying to use it
        function activate() {
            if (SpeechRecognition) {
                recognizer = new SpeechRecognition();

                // Set the 'continuous' mode on. This approach enables the speech recognition as soon as the page loads
                recognizer.continuous = true;

                // Specify the max value of the alternatives we get back
                recognizer.maxAlternatives = 3;

                recognizer.onstart = startHandler;
                recognizer.onend = endHandler;
                recognizer.onresult = resultHandler;
                recognizer.onerror = errorHandler;
            }
        }

        function addCommand (commandText, cb) {
            commands.push({ text: _.toLower(commandText), callback: cb});
        }

        function clearCommands() {
            commands.length = 0;
        }

        function setNoMatchCallback(callback) {
            noMatchCallback = callback;
        }

        function setUnrecognizedCallback(callback) {
            unrecognizedCallback = callback;
        }

        function errorHandler(err) {
            if (err.error === 'not allowed') {
                autoRestart = false;
            }

            console.log(err);
        }

        function resultHandler(event){
            if (event.results) {

                // The result variable contains all the possible alternatives the engine determined match the user's speech
                var result = event.results[event.resultIndex];
                var transcript = result[0].transcript;

                if (result.isFinal) {
                    if (result[0].confidence < .5) {
                        if (unrecognizedCallback) {
                            unrecognizedCallback(transcript);
                        }
                        else {
                            console.log("Unrecognized result: " + transcript);
                        }
                    }
                    else {
                        var match = _.find(commands,
                            { text: _.toLower(_.trim(transcript)) });

                        if (match) {
                            match.callback();
                        }
                        else if (noMatchCallback) {
                            noMatchCallback(transcript);
                        }
                        else {
                            console.log("No matching command was found for '" + transcript + "'");
                        }
                    }

                    $rootScope.$apply();
                }
            }
        }

        function startHandler() {
            isRecognizing = true;
        }

        function endHandler() {
            isRecognizing = false;

            if (autoRestart) {
                startRecognition();
            }
        }

        function startRecognition() {
            if (recognizer) {
                if(!isRecognizing) {
                    autoRestart = true;

                    recognizer.start();
                }
            }
            else {
                throw new Error('Speech recognition is not supported');
            }
        }

        function stopRecognition() {
            if (recognizer) {
                autoRestart = false;

                recognizer.stop();
            }
        }

        return service;
    }

}) ();