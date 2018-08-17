import { BlockchainLifecycle } from '@0xproject/dev-utils';
import { assetDataUtils } from '@0xproject/order-utils';
import { RevertReason, SignedOrder } from '@0xproject/types';
import { BigNumber } from '@0xproject/utils';
import * as chai from 'chai';

import { DummyERC20TokenContract } from '../../generated_contract_wrappers/dummy_erc20_token';
import { DummyERC721TokenContract } from '../../generated_contract_wrappers/dummy_erc721_token';
import { ExchangeContract } from '../../generated_contract_wrappers/exchange';
import { OrderValidatorContract } from '../../generated_contract_wrappers/order_validator';
import { artifacts } from '../utils/artifacts';
import { expectContractCallFailed } from '../utils/assertions';
import { chaiSetup } from '../utils/chai_setup';
import { constants } from '../utils/constants';
import { ERC20Wrapper } from '../utils/erc20_wrapper';
import { ERC721Wrapper } from '../utils/erc721_wrapper';
import { ExchangeWrapper } from '../utils/exchange_wrapper';
import { OrderFactory } from '../utils/order_factory';
import { provider, txDefaults, web3Wrapper } from '../utils/web3_wrapper';

chaiSetup.configure();
const expect = chai.expect;
const blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

describe('OrderValidator', () => {
    let makerAddress: string;
    let owner: string;
    let takerAddress: string;

    let erc20Token: DummyERC20TokenContract;
    let erc721Token: DummyERC721TokenContract;
    let exchange: ExchangeContract;
    let orderValidator: OrderValidatorContract;

    let signedOrder: SignedOrder;
    let orderFactory: OrderFactory;

    const tokenId = new BigNumber(123456789);

    before(async () => {
        await blockchainLifecycle.startAsync();
    });
    after(async () => {
        await blockchainLifecycle.revertAsync();
    });

    before(async () => {
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        const usedAddresses = ([owner, makerAddress, takerAddress] = _.slice(accounts, 0, 3));

        const erc20Wrapper = new ERC20Wrapper(provider, usedAddresses, owner);
        const erc721Wrapper = new ERC721Wrapper(provider, usedAddresses, owner);

        const numDummyErc20ToDeploy = 1;
        [erc20Token] = await erc20Wrapper.deployDummyTokensAsync(numDummyErc20ToDeploy, constants.DUMMY_TOKEN_DECIMALS);
        const erc20Proxy = await erc20Wrapper.deployProxyAsync();

        [erc721Token] = await erc721Wrapper.deployDummyTokensAsync();
        const erc721Proxy = await erc721Wrapper.deployProxyAsync();
        await web3Wrapper.awaitTransactionSuccessAsync(
            await erc721Token.mint.sendTransactionAsync(makerAddress, tokenId),
            constants.AWAIT_TRANSACTION_MINED_MS,
        );

        exchange = await ExchangeContract.deployFrom0xArtifactAsync(
            artifacts.Exchange,
            provider,
            txDefaults,
            assetDataUtils.encodeERC20AssetData(erc20Token.address),
        );
        const exchangeWrapper = new ExchangeWrapper(exchange, provider);
        await exchangeWrapper.registerAssetProxyAsync(erc20Proxy.address, owner);
        await exchangeWrapper.registerAssetProxyAsync(erc721Proxy.address, owner);

        orderValidator = await OrderValidatorContract.deployFrom0xArtifactAsync(
            artifacts.OrderValidator,
            provider,
            txDefaults,
            exchange.address,
        );

        const defaultOrderParams = {
            ...constants.STATIC_ORDER_PARAMS,
            exchangeAddress: exchange.address,
            makerAddress,
            feeRecipientAddress: constants.NULL_ADDRESS,
            makerAssetData: assetDataUtils.encodeERC20AssetData(erc20Token.address),
            takerAssetData: assetDataUtils.encodeERC721AssetData(erc721Token.address, tokenId),
        };
        const privateKey = constants.TESTRPC_PRIVATE_KEYS[accounts.indexOf(makerAddress)];
        orderFactory = new OrderFactory(privateKey, defaultOrderParams);
    });

    beforeEach(async () => {
        await blockchainLifecycle.startAsync();
    });
    afterEach(async () => {
        await blockchainLifecycle.revertAsync();
    });

    describe('getBalanceAndAllowance', () => {
        describe('ERC20 assetData', () => {
            it('should return the correct balance and allowance', async () => {
                const balance = new BigNumber(123);
                const allowance = new BigNumber(456);
                await web3Wrapper.awaitTransactionSuccessAsync(
                    await erc20Token.setBalance.sendTransactionAsync(makerAddress, balance),
                    constants.AWAIT_TRANSACTION_MINED_MS,
                );
            });
        });
        describe('ERC721 assetData', () => {
            it('should return a balance of 1 when the tokenId is owned by target', async () => {});
            it('should return a balance of 0 when the tokenId is not owned by target', async () => {});
            it('should return an allowance of 0 when no approval is set', async () => {});
            it('should return an allowance of 1 when ERC721Proxy is approved for all', async () => {});
            it('should return an allowance of 1 when ERC721Proxy is approved for specific tokenId', async () => {});
        });
    });

    describe('getTraderInfo', () => {});
    describe('getTradersInfo', () => {});
    describe('getOrderAndTraderInfo', () => {});
    describe('getOrdersAndTradersInfo', () => {});
});
