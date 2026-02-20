const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Твой секретный API-ключ DeepSeek (НИКОМУ НЕ ПОКАЗЫВАЙ)
const DEEPSEEK_API_KEY = 'sk-6fdce29d05ec4cf58e2b9660276ffc10'; // Замени на свой!

// Разрешаем запросы с любого источника (для разработки)
app.use(cors());
app.use(express.json());

// Эндпоинт, который будет вызывать твоя шахматная доска
app.post('/api/move', async (req, res) => {
    try {
        // Получаем данные из запроса от браузера
        const { fen, history, difficulty, turn } = req.body;

        // Формируем промпт для DeepSeek в зависимости от сложности
        const systemPrompt = getSystemPrompt(difficulty);
        const userPrompt = `Сыграй ход в шахматах. Ты играешь ${turn === 'w' ? 'белыми' : 'чёрными'}.
Текущая позиция (FEN): ${fen}.
История ходов: ${history.join(' ')}.
Сделай ход. ${difficulty === 3 ? 'Можешь добавить короткий комментарий после хода через дефис.' : 'Отвечай ТОЛЬКО ходом (например, "e4" или "Nf3"), без лишних слов.'}`;

        // Отправляем запрос в DeepSeek
        const deepseekResponse = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: getTemperature(difficulty),
            max_tokens: 60
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            }
        });

        // Отправляем ответ обратно в браузер
        res.json({
            success: true,
            move: deepseekResponse.data.choices[0].message.content
        });

    } catch (error) {
        console.error('Ошибка:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обращении к DeepSeek'
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

// Запускаем сервер
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});