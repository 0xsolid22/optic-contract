import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const DEFAULT_CANDIDATES_COUNT = 5;
const DEFAULT_CANDIDATE = 1;

describe('Voting', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshopt in every test.
  async function deployFixture() {
    const startTime = (await time.latest()) + 150;
    const endTime = startTime + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, registeredAccount, otherAccount] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory('Voting');
    const voting = await Voting.deploy(startTime, endTime, DEFAULT_CANDIDATES_COUNT);
    await voting.register(registeredAccount.address);

    return { voting, startTime, endTime, owner, registeredAccount, otherAccount };
  }

  describe('Deployment', function () {
    it('Should set the right timestamp and candidates count', async function () {
      const { voting, startTime, endTime } = await loadFixture(deployFixture);

      expect(await voting.startTime()).to.equal(startTime);
      expect(await voting.endTime()).to.equal(endTime);
      expect(await voting.candidatesCount()).to.equal(DEFAULT_CANDIDATES_COUNT);
    });

    it('Should set the right owner', async function () {
      const { voting, owner } = await loadFixture(deployFixture);

      expect(await voting.owner()).to.equal(owner.address);
    });
  });

  describe('Admin functions', function () {
    describe('setVotingPeriod', function () {
      it('Should revert with InvalidVotingPeriod error if endTime is not greater than startTime', async function () {
        const { voting, startTime } = await loadFixture(deployFixture);

        await expect(voting.setVotingPeriod(startTime, startTime)).to.be.revertedWithCustomError(
          voting,
          'InvalidVotingPeriod'
        );
      });

      it('Should revert with NotOwner error if called from another account', async function () {
        const { voting, startTime, otherAccount } = await loadFixture(deployFixture);

        await expect(
          voting.connect(otherAccount).setVotingPeriod(startTime, startTime + 1)
        ).to.be.revertedWithCustomError(voting, 'NotOwner');
      });

      it('Should success if endTime is greater than startTime and the owner calls it', async function () {
        const { voting, startTime, endTime } = await loadFixture(deployFixture);

        await expect(voting.setVotingPeriod(startTime + 1, endTime + 1)).not.to.be.reverted;
        expect(await voting.startTime()).to.equal(startTime + 1);
        expect(await voting.endTime()).to.equal(endTime + 1);
      });
    });

    describe('register', function () {
      it('Should revert with NotOwner error if called from another account', async function () {
        const { voting, owner, otherAccount } = await loadFixture(deployFixture);

        await expect(voting.connect(otherAccount).register(owner.address)).to.be.revertedWithCustomError(
          voting,
          'NotOwner'
        );
      });

      it('Should success if the owner calls it', async function () {
        const { voting, otherAccount } = await loadFixture(deployFixture);

        await expect(voting.register(otherAccount.address)).not.to.be.reverted;
        expect(await voting.registered(otherAccount.address)).to.equal(true);
      });
    });

    describe('Vote', function () {
      it('Should revert if unregistered voter tries to vote', async function () {
        const { voting, otherAccount } = await loadFixture(deployFixture);

        // await time.increaseTo(unlockTime);

        await expect(voting.connect(otherAccount).vote(DEFAULT_CANDIDATE)).to.be.revertedWithCustomError(
          voting,
          'NotRegistered'
        );
      });

      it('Should revert if voting not started yet or ended already', async function () {
        const { voting, endTime, registeredAccount } = await loadFixture(deployFixture);
        await expect(voting.connect(registeredAccount).vote(DEFAULT_CANDIDATE)).to.be.revertedWithCustomError(
          voting,
          'VoteNotAvailable'
        );
        await time.increaseTo(endTime + 1);
        await expect(voting.connect(registeredAccount).vote(DEFAULT_CANDIDATE)).to.be.revertedWithCustomError(
          voting,
          'VoteNotAvailable'
        );
      });

      it('Should revert if candidate is invalid', async function () {
        const { voting, startTime, registeredAccount } = await loadFixture(deployFixture);
        await time.increaseTo(startTime + 1);
        await expect(voting.connect(registeredAccount).vote(0)).to.be.revertedWithCustomError(
          voting,
          'InvalidCandidate'
        );
        await expect(
          voting.connect(registeredAccount).vote(DEFAULT_CANDIDATES_COUNT + 1)
        ).to.be.revertedWithCustomError(voting, 'InvalidCandidate');
      });

      it('Should vote only once', async function () {
        const { voting, startTime, registeredAccount } = await loadFixture(deployFixture);
        await time.increaseTo(startTime + 1);

        await expect(voting.connect(registeredAccount).vote(DEFAULT_CANDIDATE))
          .to.emit(voting, 'Voted')
          .withArgs(DEFAULT_CANDIDATE, registeredAccount.address);

        expect(await voting.voteResult(registeredAccount.address)).to.equal(DEFAULT_CANDIDATE);

        await expect(voting.connect(registeredAccount).vote(DEFAULT_CANDIDATE)).to.be.revertedWithCustomError(
          voting,
          'AlreadyVoted'
        );
        expect(await voting.voteCount(DEFAULT_CANDIDATE)).to.equal(1);
      });
    });
  });
});
