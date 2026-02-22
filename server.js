const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000; // Render ждёт порт 10000

// ========== ТВОЙ КЛЮЧ PROXYAPI ==========
const PROXYAPI_KEY = 'sk-2gCqWGQConyKtFaTS79BvokizJQ9iOm4';
const PROXYAPI_URL = 'https://openai.api.proxyapi.ru/v1/chat/completions';

app.use(cors());
app.use(express.json());

// ========== ЗАГЛУШКА ДЛЯ FAVICON ==========
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ========== ОСНОВНОЙ ЭНДПОИНТ ==========
app.post('/api/move', async (req, res) => {
    try {
        const { fen, history, difficulty, turn } = req.body;

        const systemPrompt = getSystemPrompt(difficulty);
        const userPrompt = `Сыграй ход в шахматах. Ты играешь ${turn === 'w' ? 'белыми' : 'чёрными'}.
Текущая позиция (FEN): ${fen}.
История ходов: ${history.join(' ')}.
Сделай ход. ${difficulty === 3 ? 'Можешь добавить короткий комментарий после хода через дефис.' : 'Отвечай ТОЛЬКО ходом (например, "e4" или "Nf3"), без лишних слов.'}`;

        const response = await axios.post(PROXYAPI_URL, {
            model: 'deepseek/deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: getTemperature(difficulty),
            max_tokens: 60
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXYAPI_KEY}`
            }
        });

        res.json({
            success: true,
            move: response.data.choices[0].message.content
        });

    } catch (error) {
        console.error('Ошибка ProxyAPI:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Ошибка сервера при обращении к API'
        });
    }
});

// Вспомогательные функции
function getSystemPrompt(level) {
    const prompts = {
        1: 'Ты полный лапоть в шахматах. Делай случайные, часто глупые ходы. Зевай фигуры. Игрок должен легко выигрывать. Отвечай только ходом.',
        2: 'Ты новичок. Старайся играть, но иногда делай ошибки: не замечай простые угрозы. Отвечай только ходом.',
        3: 'Ты любитель. Играй в свою силу, старайся делать нормальные ходы. Иногда можешь поддаться ради красоты. Можешь добавлять короткий комментарий через дефис.',
        4: 'Ты сильный шахматист. Играй серьёзно, делай лучшие ходы. Почти не ошибайся. Отвечай только ходом.',
        5: 'Ты гроссмейстер. Играй максимально сильно, используй глубокие стратегии. Не прощай ошибок. Отвечай только ходом.'
    };
    return prompts[level] || prompts[3];
}

function getTemperature(level) {
    const temps = { 1: 1.8, 2: 1.2, 3: 0.8, 4: 0.4, 5: 0.2 };
    return temps[level] || 0.8;
}

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
