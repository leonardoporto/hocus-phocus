const Alexa = require('ask-sdk-core');
const { getTimerStatus, createTimer, pauseTimer, resumeTimer, cancelTimer, updateTimerDisplay } = require('./util/timerUtils');
const fs = require('fs');
const path = require('path');

// Carregue o template APL
const pomodoroTemplate = JSON.parse(fs.readFileSync(path.join(__dirname, 'apl', 'pomodoroTemplate.json'), 'utf8'));

// Função auxiliar para verificar se o dispositivo tem display
function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
    const hasAPL = !!supportedInterfaces['Alexa.Presentation.APL'];
    console.log('Device supports APL:', hasAPL);
    console.log('Supported interfaces:', JSON.stringify(supportedInterfaces));
    return hasAPL;
}

// Função para criar payload visual
function createVisualResponse(title, timeRemaining, status, color = '#1E88E5') {
    const payload = {
        timerState: {
            title: title,
            timeRemaining: timeRemaining,
            status: status,
            color: color
        }
    };
    console.log('Visual payload:', JSON.stringify(payload));
    return payload;
}

function updateDisplay(handlerInput, timeRemaining) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const visualPayload = createVisualResponse(
        'Período de Foco',
        timeString,
        'Em andamento',
        '#E53935'
    );

    return handlerInput.responseBuilder
        .addDirective({
            type: 'Alexa.Presentation.APL.UpdateIndexListData',
            token: 'hocusPhocusToken',
            datasources: visualPayload
        })
        .getResponse();
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = 'Bem-vindo ao Hocus Phocus. Você pode iniciar um período de foco, uma pausa curta ou uma pausa longa.';
        
        const response = handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Hocus Phocus', speechText);

        if (supportsAPL(handlerInput)) {
            const visualPayload = createVisualResponse(
                'Hocus Phocus',
                '00:00',
                'Pronto para começar!',
                '#1E88E5'
            );
            
            console.log('Adding APL directive with template:', JSON.stringify(pomodoroTemplate));
            
            response.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                version: '1.8',
                document: pomodoroTemplate,
                datasources: visualPayload,
                token: 'hocusPhocusToken'
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
        try {
            createTimer(handlerInput, duration);
            
            const speechText = 'Iniciando um período de foco de 25 minutos. Mantenha o foco!';
            const response = handlerInput.responseBuilder
                .speak(speechText)
                .reprompt('Você pode me perguntar quanto tempo falta ou pausar o timer.');

            if (supportsAPL(handlerInput)) {
                const visualPayload = createVisualResponse(
                    'Período de Foco',
                    '25:00',
                    'Mantenha o foco!',
                    '#E53935'
                );
                
                response.addDirective({
                    type: 'Alexa.Presentation.APL.RenderDocument',
                    document: pomodoroTemplate,
                    datasources: visualPayload,
                    token: 'hocusPhocusToken'
                });

                // Inicia a atualização do display
                updateTimerDisplay(handlerInput);
            }

            return response.getResponse();
        } catch (error) {
            console.error('Erro ao iniciar pomodoro:', error);
            return handlerInput.responseBuilder
                .speak('Desculpe, houve um erro ao iniciar o pomodoro. Por favor, tente novamente.')
                .getResponse();
        }
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
        try {
            const timeRemaining = getTimerStatus(handlerInput);
            let speechText;
            let visualPayload;
            
            if (timeRemaining !== null) {
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                speechText = `Faltam ${minutes} minutos e ${seconds} segundos.`;
                
                visualPayload = createVisualResponse(
                    'Tempo Restante',
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
                    'Em andamento',
                    '#43A047'
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
        } catch (error) {
            console.error('Erro ao verificar tempo restante:', error);
            return handlerInput.responseBuilder
                .speak('Desculpe, houve um erro ao verificar o tempo restante. Por favor, tente novamente.')
                .getResponse();
        }
    }
};

const PauseTimerIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent';
    },
    handle(handlerInput) {
        try {
            const success = pauseTimer(handlerInput);
            
            if (success) {
                return handlerInput.responseBuilder
                    .speak('Timer pausado. Diga "continuar" para retomar.')
                    .reprompt('Diga "continuar" para retomar o timer.')
                    .getResponse();
            } else {
                return handlerInput.responseBuilder
                    .speak('Não há nenhum timer ativo para pausar.')
                    .reprompt('Você pode iniciar um novo pomodoro dizendo "iniciar pomodoro".')
                    .getResponse();
            }
        } catch (error) {
            console.error('Erro ao pausar timer:', error);
            return handlerInput.responseBuilder
                .speak('Desculpe, houve um erro ao pausar o timer. Por favor, tente novamente.')
                .getResponse();
        }
    }
};

const ResumeTimerIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent';
    },
    handle(handlerInput) {
        try {
            const success = resumeTimer(handlerInput);
            
            if (success) {
                return handlerInput.responseBuilder
                    .speak('Timer retomado. Bom trabalho!')
                    .reprompt('Você pode me perguntar quanto tempo falta ou pausar o timer.')
                    .getResponse();
            } else {
                return handlerInput.responseBuilder
                    .speak('Não há nenhum timer pausado para retomar.')
                    .reprompt('Você pode iniciar um novo pomodoro dizendo "iniciar pomodoro".')
                    .getResponse();
            }
        } catch (error) {
            console.error('Erro ao retomar timer:', error);
            return handlerInput.responseBuilder
                .speak('Desculpe, houve um erro ao retomar o timer. Por favor, tente novamente.')
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'Você pode dizer "iniciar foco" para começar um período de 25 minutos, ' +
            '"iniciar pausa" para uma pausa de 5 minutos, ou perguntar "quanto tempo falta" ' +
            'para verificar o tempo restante.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('Ajuda - Hocus Phocus', speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Até logo!';
        cancelTimer(handlerInput);

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard('Hocus Phocus', speechText)
            .withShouldEndSession(true)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Sessão encerrada com motivo: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
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
        CheckTimeRemainingIntentHandler,
        PauseTimerIntentHandler,
        ResumeTimerIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda(); 