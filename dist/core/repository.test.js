import { mock } from 'jest-mock-extended';
import { UserRepository } from './repository.js';
describe('repository', () => {
    let dbMock = mock();
    beforeEach(() => {
        dbMock = mock();
    });
    describe('#addUsers', () => {
        test('should add correct users and filter bots', async () => {
            const instance = new UserRepository(dbMock);
            const chatId = 1;
            const userOne = mock({
                id: 1,
                username: 'test_username',
                is_bot: false,
            });
            const userTwo = mock({
                id: 2,
                username: 'test_username_2',
                is_bot: false,
            });
            const users = [
                mock({ username: undefined }),
                mock({ is_bot: true }),
                userOne,
                userTwo,
            ];
            await instance.addUsers(chatId, users);
            expect(dbMock.hSet).toBeCalledWith(chatId.toString(), {
                [userOne.id.toString()]: userOne.username,
                [userTwo.id.toString()]: userTwo.username,
            });
        });
    });
    describe('#getUsernamesByChatId', () => {
        test('should correct call db and return data', async () => {
            const instance = new UserRepository(dbMock);
            const data = {
                id1: 'username1',
                id2: 'username2',
            };
            dbMock.hGetAll.mockResolvedValue(data);
            const chatId = 1;
            const result = await instance.getUsernamesByChatId(chatId);
            expect(dbMock.hGetAll).toBeCalledWith(chatId.toString());
            expect(result).toStrictEqual(Object.values(data));
        });
    });
    describe('#deleteUser', () => {
        test('should correct call db for user removing', async () => {
            const instance = new UserRepository(dbMock);
            const userId = 2;
            const chatId = 1;
            await instance.deleteUser(chatId, userId);
            expect(dbMock.hDel).toBeCalledWith(chatId.toString(), userId.toString());
        });
    });
});
