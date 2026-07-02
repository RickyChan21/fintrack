import os
import pandas as pd
import streamlit as st
from sqlmodel import Session, create_engine, select
from dotenv import load_dotenv

from models import Transaction

# Premium Page Config
st.set_page_config(page_title="Fintrack Dashboard", page_icon="💸", layout="wide")

# Custom CSS for Premium Glassmorphism & Dark Mode
st.markdown("""
<style>
    /* Global Background */
    .stApp {
        background-color: #0E1117;
        color: #FAFAFA;
        font-family: 'Inter', sans-serif;
    }
    
    /* Hide the default Streamlit menu and footer for a cleaner app feel */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}

    /* Premium Metrics Card Styling (Glassmorphism) */
    div[data-testid="metric-container"] {
        background: rgba(39, 39, 42, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: transform 0.2s ease;
    }
    div[data-testid="metric-container"]:hover {
        transform: translateY(-5px);
        border-color: rgba(16, 185, 129, 0.4);
    }
    
    /* Metric Typography */
    [data-testid="stMetricValue"] {
        font-size: 2.2rem;
        font-weight: 800;
        color: #10B981; /* Emerald Green */
    }
    [data-testid="stMetricLabel"] {
        font-size: 1rem;
        color: #A1A1AA; /* Muted gray */
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    /* Headers */
    h1, h2, h3 {
        color: #FFFFFF;
        font-weight: 700;
        letter-spacing: -0.5px;
    }
</style>
""", unsafe_allow_html=True)

st.title("💸 Fintrack Intelligence")
st.markdown("Your automated financial AI, visualized.")
st.markdown("---")

# Load Data efficiently
@st.cache_data(ttl=60) # Cache the data for 60 seconds
def load_data():
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        st.error("DATABASE_URL is not set.")
        return pd.DataFrame()
        
    engine = create_engine(DATABASE_URL)
    with Session(engine) as session:
        statement = select(Transaction)
        results = session.exec(statement).all()
        
        if not results:
            return pd.DataFrame()
            
        # Convert models to dictionaries for pandas
        data = [
            {
                "Date": tx.transaction_date,
                "Merchant": tx.merchant,
                "Amount": tx.amount,
                "Category": tx.category,
                "Type": tx.transaction_type,
                "Bank": tx.bank
            } for tx in results
        ]
        df = pd.DataFrame(data)
        if not df.empty and 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'])
            df = df.sort_values(by='Date', ascending=False)
        return df

df = load_data()

if df.empty:
    st.info("No transactions found in the database yet. Let the worker process some emails first!")
else:
    # ------------------ KPI METRICS ------------------
    total_spent = df['Amount'].sum()
    tx_count = len(df)
    
    if 'Category' in df.columns and not df['Category'].dropna().empty:
        top_cat_series = df.groupby('Category')['Amount'].sum()
        top_category = top_cat_series.idxmax() if not top_cat_series.empty else "N/A"
    else:
        top_category = "N/A"

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Tracked", f"${total_spent:,.2f}")
    with col2:
        st.metric("Transactions Processed", f"{tx_count}")
    with col3:
        st.metric("Top Spending Category", top_category)
        
    st.markdown("<br>", unsafe_allow_html=True)
    
    # ------------------ CHARTS ------------------
    col_chart1, col_chart2 = st.columns(2)
    
    with col_chart1:
        st.subheader("📊 Spending by Category")
        cat_spending = df.groupby("Category")["Amount"].sum().reset_index()
        cat_spending = cat_spending.sort_values(by="Amount", ascending=False)
        # Built-in elegant bar chart
        st.bar_chart(cat_spending, x="Category", y="Amount", color="#10B981")
        
    with col_chart2:
        st.subheader("📈 Timeline")
        
        # Sleek horizontal selector for time resolution
        time_res = st.radio(
            "Resolution", 
            ["Daily", "Weekly", "Monthly", "Yearly"], 
            horizontal=True, 
            label_visibility="collapsed"
        )
        
        timeline = df.copy()
        # Ensure we only plot rows that actually have a date
        timeline = timeline.dropna(subset=['Date']) 
        
        # Group data based on the selected resolution
        if time_res == "Daily":
            timeline['Date'] = timeline['Date'].dt.date
        elif time_res == "Weekly":
            timeline['Date'] = timeline['Date'].dt.to_period('W').apply(lambda r: r.start_time).dt.date
        elif time_res == "Monthly":
            timeline['Date'] = timeline['Date'].dt.to_period('M').apply(lambda r: r.start_time).dt.date
        elif time_res == "Yearly":
            timeline['Date'] = timeline['Date'].dt.to_period('Y').apply(lambda r: r.start_time).dt.date
            
        timeline_spending = timeline.groupby("Date")["Amount"].sum().reset_index()
        
        # Built-in elegant line chart
        st.line_chart(timeline_spending, x="Date", y="Amount", color="#3B82F6")
        
    # ------------------ DATA TABLE ------------------
    st.markdown("---")
    st.subheader("📝 Recent Transactions")
    display_df = df.copy()
    
    # Format the Date nicely for display
    display_df['Date'] = display_df['Date'].dt.strftime('%b %d, %Y')
    
    # Make columns look nicer
    display_df = display_df[['Date', 'Merchant', 'Amount', 'Category', 'Bank', 'Type']]
    
    st.dataframe(
        display_df, 
        use_container_width=True, 
        hide_index=True,
        column_config={
            "Amount": st.column_config.NumberColumn("Amount ($)", format="$%.2f")
        }
    )
