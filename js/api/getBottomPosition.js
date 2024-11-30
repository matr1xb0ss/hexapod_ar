async function getBottomPosition() {
  try {
    const response = await fetch(
      "https://control03.devdroid.local/get_body_metric"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching bottom position:", error);
    return null;
  }
}

export default getBottomPosition;
