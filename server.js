const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Твой ключ ProxyAPI (OpenRouter)
const PROXYAPI_KEY = 'sk-2gCqWGQConyKtFaTS79BvokizJQ9iOm4';
const PROXYAPI_URL = 'https://openai.api.proxyapi.ru/v1/chat/completions';

app.use(cors());
app.use(express.json());

// Заглушка для favicon, чтобы не сыпало ошибками в консоль
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Основной эндпоинт для ходов
app.post('/api/move', async (req, res) => {
    try {
        const { fen, history, difficulty, turn } = req.body;

        if (!fen || !history || difficulty === undefined || !turn) {
            return res.status(400).json({ success: false, error: 'Неполные данные' });
        }

        const systemPrompt = getSystemPrompt(difficulty);
        const userPrompt = `Сыграй ход в шахматах. Ты играешь ${turn === 'w' ? 'белыми' : 'чёрными'}.
Текущая позиция (FEN): ${fen}.
История ходов: ${history.join(' ')}.
Сделай ход. ОТВЕЧАЙ ТОЛЬКО В ФОРМАТЕ UCI (например, "e2e4" или "g1f3"). НИКАКИХ комментариев, ничего лишнего.`;

        const response = await axios.post(PROXYAPI_URL, {
            model: 'openrouter/deepseek/deepseek-chat-v3.1', // можно :free
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: getTemperature(difficulty),
            max_tokens: 20
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PROXYAPI_KEY}`
            }
        });

        let move = response.data?.choices?.[0]?.message?.content?.trim();
        if (!move) throw new Error('Пустой ответ от API');

        // Оставляем только допустимые символы UCI (буквы a-h и цифры 1-8)
        move = move.replace(/[^a-h1-8]/g, '');
        if (!/^[a-h][1-8][a-h][1-8]$/.test(move)) {
            throw new Error(`Неверный формат хода: ${move}`);
        }

        res.json({ success: true, move });

    } catch (error) {
        console.error('Ошибка ProxyAPI:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error?.message || 'Ошибка сервера при обращении к API'
        });
    }
});

// Уровни сложности
function getSystemPrompt(level) {
    const prompts = {
        1: 'Ты полный лапоть в шахматах. Делай случайные, часто глупые ходы. Отвечай ТОЛЬКО UCI.',
        2: 'Ты новичок. Старайся играть, но иногда делай ошибки. Отвечай ТОЛЬКО UCI.',
        3: 'Ты любитель. Играй в свою силу, старайся делать нормальные ходы. Отвечай ТОЛЬКО UCI.',
        4: 'Ты сильный шахматист. Играй серьёзно, делай лучшие ходы. Отвечай ТОЛЬКО UCI.',
        5: 'Ты гроссмейстер. Играй максимально сильно, используй глубокие стратегии. Отвечай ТОЛЬКО UCI.'
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
