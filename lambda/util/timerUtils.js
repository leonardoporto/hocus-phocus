const TIMER_KEY = 'timer';

function createTimer(handlerInput, duration) {
    const attributesManager = handlerInput.attributesManager;
    const timer = {
        startTime: Date.now(),
        duration: duration,
        remaining: duration,
        status: 'RUNNING'
    };
    
    const attributes = attributesManager.getSessionAttributes();
    attributes[TIMER_KEY] = timer;
    attributesManager.setSessionAttributes(attributes);

    // Inicia a atualização do display
    updateTimerDisplay(handlerInput);
}

function updateTimerDisplay(handlerInput) {
    const timeRemaining = getTimerStatus(handlerInput);
    
    if (timeRemaining !== null && timeRemaining > 0) {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        if (supportsAPL(handlerInput)) {
            handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.ExecuteCommands',
                token: 'hocusPhocusToken',
                commands: [
                    {
                        type: 'Sequential',
                        commands: [
                            {
                                type: 'SetValue',
                                componentId: 'timeRemaining',
                                property: 'text',
                                value: timeString
                            },
                            {
                                type: 'SetValue',
                                componentId: 'status',
                                property: 'text',
                                value: 'Em andamento'
                            },
                            {
                                type: 'Idle',
                                delay: 1000
                            },
                            {
                                type: 'AutoPage',
                                componentId: 'timeRemaining',
                                duration: 1000
                            }
                        ],
                        repeatCount: -1 // Repete indefinidamente
                    }
                ]
            });
        }
    }
}

function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
    return !!supportedInterfaces['Alexa.Presentation.APL'];
}

function getTimerStatus(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const attributes = attributesManager.getSessionAttributes();
    const timer = attributes[TIMER_KEY];
    
    if (!timer) return null;
    
    if (timer.status === 'PAUSED') {
        return timer.remaining;
    }
    
    const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
    const remaining = Math.max(0, timer.duration - elapsed);
    
    return remaining;
}

function pauseTimer(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const attributes = attributesManager.getSessionAttributes();
    const timer = attributes[TIMER_KEY];
    
    if (timer && timer.status === 'RUNNING') {
        const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        timer.remaining = Math.max(0, timer.duration - elapsed);
        timer.status = 'PAUSED';
        attributesManager.setSessionAttributes(attributes);
        return true;
    }
    return false;
}

function resumeTimer(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const attributes = attributesManager.getSessionAttributes();
    const timer = attributes[TIMER_KEY];
    
    if (timer && timer.status === 'PAUSED') {
        timer.startTime = Date.now();
        timer.duration = timer.remaining;
        timer.status = 'RUNNING';
        attributesManager.setSessionAttributes(attributes);
        
        // Reinicia a atualização do display
        updateTimerDisplay(handlerInput);
        return true;
    }
    return false;
}

function cancelTimer(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const attributes = attributesManager.getSessionAttributes();
    delete attributes[TIMER_KEY];
    attributesManager.setSessionAttributes(attributes);
}

module.exports = {
    createTimer,
    getTimerStatus,
    pauseTimer,
    resumeTimer,
    cancelTimer,
    updateTimerDisplay
}; 