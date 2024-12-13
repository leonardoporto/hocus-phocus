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
    cancelTimer
}; 