import { track } from '@amplitude/analytics-browser';
import { Dialog } from '@headlessui/react';
import Button from 'components/common/Button';
import Modal from 'components/common/Modal';
import { utils } from 'ethers';
import { DONATION_ADDRESS } from 'lib/constants';
import { getChainNativeToken, getDefaultDonationAmount } from 'lib/utils/chains';
import useTranslation from 'next-translate/useTranslation';
import type { MutableRefObject, ReactText } from 'react';
import { useEffect, useState } from 'react';
import { useAsyncCallback } from 'react-async-hook';
import { toast } from 'react-toastify';
import { useNetwork, useSigner } from 'wagmi';
import Input from './Input';

interface Props {
  size: 'sm' | 'md' | 'lg' | 'none';
  style?: 'primary' | 'secondary' | 'tertiary' | 'none';
  className?: string;
  parentToastRef?: MutableRefObject<ReactText>;
}

const DonateButton = ({ size, style, className, parentToastRef }: Props) => {
  const { t } = useTranslation();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();

  const nativeToken = getChainNativeToken(chain?.id);
  const [amount, setAmount] = useState<string>(getDefaultDonationAmount(nativeToken));

  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (parentToastRef) {
      toast.update(parentToastRef.current, { autoClose: false, closeButton: false, draggable: false });
    }
    setOpen(true);
  };

  const handleClose = () => {
    if (parentToastRef) toast.dismiss(parentToastRef.current);
    setOpen(false);
  };

  useEffect(() => {
    setAmount(getDefaultDonationAmount(nativeToken));
  }, [nativeToken]);

  const sendDonation = async () => {
    if (!signer || !chain?.id) {
      alert('Please connect your web3 wallet to donate');
    }

    try {
      await signer.sendTransaction({
        to: DONATION_ADDRESS,
        from: await signer.getAddress(),
        value: utils.parseEther(amount),
      });

      toast.info(t('common:toasts.donation_sent'));

      track('Donated', { chainId: chain?.id, amount: Number(amount) });

      handleClose();
    } catch (err) {
      if (err.code && err.code === 'INVALID_ARGUMENT') {
        alert('Input is not a valid number');
      }

      console.log(err);
    }
  };

  const { execute, loading } = useAsyncCallback(sendDonation);

  return (
    <>
      <Button style={style ?? 'primary'} size={size} className={className} onClick={handleOpen}>
        {t('common:buttons.donate')}
      </Button>

      <Modal open={open} setOpen={(open) => (open ? handleOpen() : handleClose())}>
        <div className="sm:flex sm:items-start">
          <div className="w-full flex flex-col gap-2 pb-2">
            <Dialog.Title as="h3" className="text-center">
              {t('common:donate.title')}
            </Dialog.Title>

            <div className="h-9 flex">
              <Input
                size="md"
                type="number"
                step={0.01}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="z-10 rounded-r-none text-zinc-600 dark:text-zinc-400 w-full"
              />
              <div className="px-3 py-1.5 border-y border-black dark:border-white bg-zinc-300 dark:bg-zinc-700 flex justify-center items-center">
                {nativeToken}
              </div>
              <Button
                loading={loading}
                style="primary"
                size="md"
                onClick={execute}
                className="rounded-l-none max-w-16 flex justify-center items-center"
              >
                {loading ? t('common:buttons.sending') : t('common:buttons.send')}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DonateButton;
