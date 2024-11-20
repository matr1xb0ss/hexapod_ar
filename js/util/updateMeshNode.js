import getTopPosition from "../api/getTopPosition.js";
// import getBottomPosition from "../api/getBottomPosition.js";

function updateMeshNode(topMesh, scene) {
  setInterval(async () => {
    try {
      const topPosition = await getTopPosition();
      // const bottomPosition = await getBottomPosition();

      // Update TOP mesh position
      if (topPosition) {
        const { vertices, indices } = topPosition;

        topMesh.updateVertices(vertices);
        topMesh.updateIndices(indices);
      }

      // Update BOTTOM mesh position
      // if (bottomPosition) {
      //   }

      // Update mesh position
      // scene.requestRender();
    } catch (error) {
      console.error("Error updating mesh positions:", error);
    }
    // Trigger the next update in 1 second
  }, 1000);
}

export default updateMeshNode;
