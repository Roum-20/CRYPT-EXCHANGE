import streamlit as st
from services.bank import (
    deposit, withdraw, reset_fiat_balance,
    get_fiat_balance, save_bank_details,
    get_bank_details, reset_bank_details
)

def main():
    st.header("Bank Account - Deposit / Withdraw")
    user_id = st.session_state.get('user_id')
    if not user_id:
        st.warning("Please login first.")
        return

    fiat_balance = get_fiat_balance(user_id)
    st.write(f"Current Fiat Balance: ${fiat_balance:.2f}")

    bank_details = get_bank_details(user_id)

    account_number = st.text_input(
        "Bank Account Number",
        value=bank_details['account_number'],
        max_chars=12
    )
    ifsc_code = st.text_input(
        "IFSC Code",
        value=bank_details['ifsc_code'],
        max_chars=11
    )

    if st.button("Save Bank Details"):
        if len(account_number) != 12 or not account_number.isdigit():
            st.error("Bank Account Number must be exactly 12 digits.")
        elif len(ifsc_code) != 11 or not ifsc_code.isalnum():
            st.error("IFSC Code must be exactly 11 alphanumeric characters.")
        else:
            save_bank_details(user_id, account_number, ifsc_code)
            st.success("Bank details saved successfully!")

    if st.button("Reset Bank Details"):
        success, msg = reset_bank_details(user_id)
        if success:
            st.success(msg)
        else:
            st.error(msg)

    st.markdown("---")

    amount = st.number_input("Amount", min_value=0.0, format="%.2f")

    if st.button("Deposit"):
        success, msg = deposit(user_id, amount)
        if success:
            st.success(msg)
        else:
            st.error(msg)

    if st.button("Withdraw"):
        success, msg = withdraw(user_id, amount)
        if success:
            st.success(msg)
        else:
            st.error(msg)

    st.markdown("---")

    if st.button("Reset Fiat Balance"):
        success, msg = reset_fiat_balance(user_id)
        if success:
            st.success(msg)
        else:
            st.error(msg)
