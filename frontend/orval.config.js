export default {
    'frame-api': {
        input: 'http://localhost:5000/api/docs/spec.json',
        output: {
            mode: 'split',
            target: 'src/api/generated/api.ts',
            client: 'axios',
        },
    },
};
