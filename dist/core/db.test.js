import { createDB } from './db.js';
import * as redis from 'redis';
import { anyFunction, mock } from 'jest-mock-extended';
describe('db', () => {
    describe('#createDB', () => {
        test('should throw error if not uri passed', async () => {
            await expect(async () => {
                await createDB(undefined);
            }).rejects.toThrow();
        });
        test('should return correct redis client', async () => {
            const clientMock = mock();
            const mockFn = jest
                .spyOn(redis, 'createClient')
                .mockReturnValue(clientMock);
            const uri = 'asd';
            const client = await createDB(uri);
            expect(mockFn).toBeCalledWith({ url: uri });
            expect(client).toEqual(clientMock);
            expect(client.connect).toBeCalledTimes(1);
        });
        test('should handle redis client error and reconnect', async () => {
            const handler = jest.fn();
            const clientMock = mock({
                on: handler,
                isOpen: false,
            });
            clientMock.connect.mockResolvedValue();
            jest.spyOn(redis, 'createClient').mockReturnValue(clientMock);
            handler.mockImplementation((_, errorHandler) => {
                errorHandler('testError');
            });
            const uri = 'asd';
            const client = await createDB(uri);
            expect(client).toEqual(clientMock);
            expect(handler).toBeCalledWith('error', anyFunction());
            expect(client.connect).toBeCalledTimes(2);
        });
    });
});
