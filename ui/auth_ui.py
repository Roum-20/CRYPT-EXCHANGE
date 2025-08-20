import streamlit as st
from services.auth import register_user, login_user

def main():
    st.header("User Authentication")
    choice = st.radio("Login or Register", ("Login", "Register"))
    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button(choice):
        if choice == "Register":
            if register_user(username, password):
                st.success("Registered successfully! Please login.")
            else:
                st.error("Registration failed. Username may exist.")
        elif choice == "Login":
            user_id = login_user(username, password)
            if user_id:
                st.success(f"Logged in as {username}")
                st.session_state['user_id'] = user_id
            else:
                st.error("Login failed. Check username/password.")