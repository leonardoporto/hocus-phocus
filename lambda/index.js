const Alexa = require('ask-sdk-core');
const { getTimerStatus, createTimer, pauseTimer, resumeTimer, cancelTimer } = require('./util/timerUtils');
const pomodoroTemplate = require('./apl/pomodoroTemplate.json');

// Função auxiliar para verificar se o dispositivo tem display
function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
    return !!supportedInterfaces['Alexa.Presentation.APL'];
}

// Função para criar payload visual
function createVisualResponse(title, timeRemaining, status, color = '#FFFFFF') {
    return {
        timerState: {
            title: title,
            timeRemaining: timeRemaining,
            status: status,
            color: color
        }
    };
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Bem-vindo ao Pomodoro Timer. Você pode iniciar um pomodoro, uma pausa curta ou uma pausa longa.';
        
        const response = handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Pomodoro Timer', speechText);

        if (supportsAPL(handlerInput)) {
            const visualPayload = createVisualResponse(
                'Pomodoro Timer',
                '00:00',
                'Pronto para começar!'
            );
            
            response.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                document: pomodoroTemplate,
                datasources: visualPayload
            });
        }

        return response.getResponse();
    }
};

const StartPomodoroIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartPomodoroIntent';
    },
    handle(handlerInput) {
        const duration = 25 * 60;
        createTimer(handlerInput, duration);
        
        const speechText = 'Iniciando um pomodoro de 25 minutos. Bom trabalho!';
        const response = handlerInput.responseBuilder
            .speak(speechText)
            .reprompt('Você pode me perguntar quanto tempo falta ou pausar o timer.');

        if (supportsAPL(handlerInput)) {
            const visualPayload = createVisualResponse(
                'Pomodoro em Andamento',
                '25:00',
                'Foco total!',
                '#FF4444'
            );
            
            response.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                document: pomodoroTemplate,
                datasources: visualPayload
            });
        }

        return response.getResponse();
    }
};

const StartShortBreakIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartShortBreakIntent';
    },
    handle(handlerInput) {
        const duration = 5 * 60; // 5 minutos em segundos
        createTimer(handlerInput, duration);
        
        const speechText = 'Iniciando uma pausa curta de 5 minutos.';
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt('Você pode me perguntar quanto tempo falta ou pausar o timer.')
            .getResponse();
    }
};

const CheckTimeRemainingIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckTimeRemainingIntent';
    },
    handle(handlerInput) {
        const timeRemaining = getTimerStatus(handlerInput);
        let speechText;
        let visualPayload;
        
        if (timeRemaining) {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            speechText = `Faltam ${minutes} minutos e ${seconds} segundos.`;
            
            visualPayload = createVisualResponse(
                'Tempo Restante',
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                'Em andamento',
                '#FF4444'
            );
        } else {
            speechText = 'Não há nenhum timer ativo no momento.';
            visualPayload = createVisualResponse(
                'Sem Timer Ativo',
                '--:--',
                'Inicie um novo timer'
            );
        }
        
        const response = handlerInput.responseBuilder
            .speak(speechText)
            .reprompt('Posso ajudar com mais alguma coisa?');

        if (supportsAPL(handlerInput)) {
            response.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                document: pomodoroTemplate,
                datasources: visualPayload
            });
        }

        return response.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        const speechText = 'Desculpe, não entendi o comando. Por favor, tente novamente.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        StartPomodoroIntentHandler,
        StartShortBreakIntentHandler,
        CheckTimeRemainingIntentHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda(); 