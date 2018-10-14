import React, { Component } from 'react';
import _flowRight from 'lodash/flowRight';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import TextField from '@material-ui/core/TextField';
import { withStyles } from '@material-ui/core/styles';
import { withFactomCli } from '../Context/FactomCliContext';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import PropTypes from 'prop-types';
import Grid from '@material-ui/core/Grid';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import WalletInfoHeader from './Shared/WalletInfoHeader';
import {
	isValidFctPrivateAddress,
	isValidFctPublicAddress,
} from 'factom/dist/factom-struct';
import CircularProgress from '@material-ui/core/CircularProgress';
import { withWalletContext } from '../Context/WalletContext';
import TransactionPreview from './TransactionPreview';

const sendFactoidAmountPath = 'sendFactoidAmount';
const recipientAddressPath = 'recipientAddress';
const myFctWalletAnchorElPath = 'myFctWalletAnchorEl';
const privateKeyPath = 'privateKey';
const FACTOSHI_MULTIPLIER = 0.00000001;
const FACTOID_MULTIPLIER = 100000000;

class SendFactoidForm extends Component {
	handleKeyPress(event) {
		if (event.target.type !== 'textarea' && event.which === 13 /* Enter */) {
			event.preventDefault();
		}
	}

	getMax(balance, fee) {
		return balance * FACTOSHI_MULTIPLIER - fee;
	}

	render() {
		const { classes } = this.props;

		const {
			factoidWallets,
			getActiveFctWallet,
			updateBalances,
			sendFactoidFee,
		} = this.props.walletController;
		const activeFctWallet = getActiveFctWallet();
		const { factomCli } = this.props.factomCliController;

		return (
			<Formik
				initialValues={{
					sendFactoidAmount: '',
					recipientAddress: '',
					myFctWalletAnchorEl: null,
					privateKey: '',
					transactionID: null,
				}}
				onSubmit={async (values, actions) => {
					const { sendFactoidAmount, recipientAddress, privateKey } = values;

					const transaction = await factomCli.createFactoidTransaction(
						privateKey,
						recipientAddress,
						FACTOID_MULTIPLIER * sendFactoidAmount
					);

					const txId = await factomCli.sendTransaction(transaction);
					actions.setFieldValue('transactionID', txId);

					updateBalances();
				}}
				validationSchema={Yup.object().shape({
					sendFactoidAmount: Yup.string().required('Required'),
					recipientAddress: Yup.string().test(
						recipientAddressPath,
						'Invalid Address',
						isValidFctPublicAddress
					),
					privateKey: Yup.string().test(
						privateKeyPath,
						'Invalid Key',
						isValidFctPrivateAddress
					),
				})}
				render={({
					isSubmitting,
					errors,
					touched,
					values,
					setFieldValue,
					handleReset,
				}) => (
					<Form onKeyPress={this.handleKeyPress}>
						<WalletInfoHeader wallet={activeFctWallet} />
						<Field name={recipientAddressPath}>
							{({ field, form }) => (
								<TextField
									error={
										errors[recipientAddressPath] &&
										touched[recipientAddressPath]
											? true
											: false
									}
									{...field}
									label="Recipient FCT address"
									fullWidth={true}
									type="text"
									placeholder="Enter Factoid Address"
									disabled={isSubmitting}
								/>
							)}
						</Field>
						<Grid container justify="space-between">
							<Grid item>
								<ErrorMessage
									name={recipientAddressPath}
									render={(msg) => (
										<div className={classes.errorText}>{msg}</div>
									)}
								/>
							</Grid>
							<Grid item>
								<FactoidWalletMenu
									values={values}
									setFieldValue={setFieldValue}
									factoidWallets={factoidWallets}
									activeFctWallet={activeFctWallet}
								/>
								<Typography
									variant="caption"
									aria-owns={
										values[myFctWalletAnchorElPath] ? 'simple-menu' : null
									}
									aria-haspopup="true"
									onClick={(event) => {
										setFieldValue(myFctWalletAnchorElPath, event.currentTarget);
									}}
									className={classes.pointer}
								>
									Send to one of my addresses
								</Typography>
							</Grid>
						</Grid>

						<Field name={sendFactoidAmountPath}>
							{({ field, form }) => (
								<TextField
									type="number"
									error={
										errors[sendFactoidAmountPath] &&
										touched[sendFactoidAmountPath]
											? true
											: false
									}
									{...field}
									placeholder="Enter Amount (FCT)"
									label="Amount"
									fullWidth={true}
									disabled={isSubmitting}
								/>
							)}
						</Field>
						<Grid container justify="space-between">
							<Grid item>
								<ErrorMessage
									name={sendFactoidAmountPath}
									render={(msg) => (
										<div className={classes.errorText}>{msg}</div>
									)}
								/>
							</Grid>
							<Grid item>
								<Typography
									variant="caption"
									onClick={(event) => {
										setFieldValue(
											sendFactoidAmountPath,
											this.getMax(activeFctWallet.balance, sendFactoidFee)
										);
									}}
									className={classes.pointer}
								>
									Use Max
								</Typography>
							</Grid>
						</Grid>
						<Field name={privateKeyPath}>
							{({ field, form }) => (
								<TextField
									error={
										errors[privateKeyPath] && touched[privateKeyPath]
											? true
											: false
									}
									{...field}
									placeholder={
										'Enter Private Key for ' + activeFctWallet.nickname
									}
									label="Private Key"
									fullWidth={true}
									disabled={isSubmitting}
								/>
							)}
						</Field>
						<ErrorMessage
							name={privateKeyPath}
							render={(msg) => <div className={classes.errorText}>{msg}</div>}
						/>

						{values.sendFactoidAmount ? (
							<TransactionPreview factoidAmount={values.sendFactoidAmount} />
						) : (
							''
						)}
						<br />
						<br />
						<br />

						{isSubmitting ? (
							<div>
								{values.transactionID !== null ? (
									<span>
										<Typography>
											<b>Transaction ID:</b> {values.transactionID}
										</Typography>
										<br />
										<Button
											type="button"
											className="outline"
											color="primary"
											variant="raised"
											onClick={handleReset}
											//disabled={!dirty || isSubmitting}
										>
											New Transaction
										</Button>
									</span>
								) : (
									<CircularProgress thickness={7} />
								)}
							</div>
						) : (
							<Button
								className={classes.sendButton}
								variant="raised"
								color="primary"
								type="submit"
								disabled={isSubmitting}
							>
								Send Factoids
							</Button>
						)}

						<br />
						<br />
						<Typography>
							Please verify all details are correct before hitting send.
							<br />
							Nobody can reverse mistaken transactions.
						</Typography>
					</Form>
				)}
			/>
		);
	}
}

function FactoidWalletMenu(props) {
	const { values, setFieldValue, factoidWallets, activeFctWallet } = props;

	const walletList = factoidWallets
		.filter((wallet) => wallet.address !== activeFctWallet.address)
		.map((wallet, index) => (
			<MenuItem
				key={index}
				onClick={() => {
					setFieldValue(myFctWalletAnchorElPath, null);
					setFieldValue(recipientAddressPath, wallet.address);
				}}
			>
				{wallet.nickname}
			</MenuItem>
		));
	return (
		<Menu
			id="simple-menu"
			anchorEl={values[myFctWalletAnchorElPath]}
			open={Boolean(values[myFctWalletAnchorElPath])}
			onClose={() => {
				setFieldValue(myFctWalletAnchorElPath, null);
			}}
		>
			{walletList}
		</Menu>
	);
}

SendFactoidForm.propTypes = {
	classes: PropTypes.object.isRequired,
};

const styles = {
	sendButton: {
		width: '50%',
		height: '24px',
	},
	errorText: { color: 'red', fontSize: '12px', textAlign: 'left' },
	pointer: {
		cursor: 'pointer',
	},
};

const enhancer = _flowRight(
	withWalletContext,
	withFactomCli,
	withStyles(styles)
);

export default enhancer(SendFactoidForm);
